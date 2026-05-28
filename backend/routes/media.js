import express from 'express';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Media from '../models/Media.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { getUploadPresignedUrl, getDownloadPresignedUrl, detectImageLabels, searchFaces, IS_MOCK, s3Client, BUCKET_NAME } from '../utils/awsHelper.js';
import { applyWatermark } from '../utils/watermark.js';

const router = express.Router();
const UPLOADS_DIR = path.resolve('uploads');

// Utility to helper parse S3 body to buffer
const streamToBuffer = (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(Buffer.concat(chunks)));
});

// @desc    Request upload S3 URL (or mock URL) for media (photos/videos)
// @route   POST /api/media/request-upload
// @access  Private
router.post('/request-upload', protect, async (req, res) => {
  const { fileName, contentType, eventId } = req.body;

  if (!fileName || !contentType || !eventId) {
    return res.status(400).json({ success: false, message: 'fileName, contentType, and eventId are required' });
  }

  try {
    const key = `events/${eventId}/${Date.now()}-${fileName}`;
    const presignedData = await getUploadPresignedUrl(key, contentType);
    res.json({ success: true, data: { ...presignedData, eventId } });
  } catch (error) {
    console.error('Request upload URL error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mock upload endpoint (accepts binary PUT body, matches S3 behavior)
// @route   PUT /api/media/mock-upload
// @access  Public (mock only)
router.put('/mock-upload', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
  const key = req.query.key;

  if (!key) {
    return res.status(400).json({ success: false, message: 'key query parameter is required' });
  }

  try {
    const filePath = path.join(UPLOADS_DIR, key);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, req.body);
    console.log(`[MOCK S3] Saved local file upload to: ${filePath}`);
    res.json({ success: true, message: 'Mock S3 upload complete', key });
  } catch (error) {
    console.error('Mock upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Serve local mock S3 files
// @route   GET /api/media/mock-files/*
// @access  Public (mock only)
router.get('/mock-files/*', (req, res) => {
  const fileKey = req.params[0];
  const filePath = path.join(UPLOADS_DIR, fileKey);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// @desc    Confirm upload and process (watermark preview, AI auto-tag, facial match, notify)
// @route   POST /api/media/confirm-upload
// @access  Private
router.post('/confirm-upload', protect, async (req, res) => {
  const { key, eventId, isPublic = true } = req.body;

  if (!key || !eventId) {
    return res.status(400).json({ success: false, message: 'key and eventId are required' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    let originalBuffer;
    let mimeType = key.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'; // simple check

    // 1. Get original file buffer
    if (IS_MOCK) {
      const localFilePath = path.join(UPLOADS_DIR, key);
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ success: false, message: 'Uploaded file not found in local mock S3' });
      }
      originalBuffer = fs.readFileSync(localFilePath);
    } else {
      const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
      const s3Response = await s3Client.send(getCommand);
      originalBuffer = await streamToBuffer(s3Response.Body);
      if (s3Response.ContentType) mimeType = s3Response.ContentType;
    }

    let tags = [];
    let matchedUserIds = [];
    let previewKey = key; // default: original key
    let previewUrl = IS_MOCK 
      ? `http://localhost:5001/api/media/mock-files/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    // 2. Perform AI operations if image
    const isImage = mimeType.startsWith('image/');
    if (isImage) {
      // AI Labels detection
      tags = await detectImageLabels(originalBuffer);

      // AI Facial recognition
      const matchedFaceIds = await searchFaces(originalBuffer);
      
      if (!IS_MOCK) {
        // Query users with matching face IDs
        const matchedUsers = await User.find({ faceId: { $in: matchedFaceIds } });
        matchedUserIds = matchedUsers.map(u => u._id);
      } else {
        // Mock matching: Randomly match 1 to 2 members of the event RSVP list
        if (event.attendees && event.attendees.length > 0) {
          const attendeeCount = Math.min(2, event.attendees.length);
          // Shuffle and slice
          const shuffled = [...event.attendees].sort(() => 0.5 - Math.random());
          matchedUserIds = shuffled.slice(0, attendeeCount);
        }
      }

      // 3. Generate static watermarked preview
      const previewBuffer = await applyWatermark(
        originalBuffer, 
        event.clubName, 
        event.title, 
        'Viewer', 
        'PREVIEW'
      );

      // Save preview
      previewKey = key.replace('events/', 'previews/');
      if (IS_MOCK) {
        const previewFilePath = path.join(UPLOADS_DIR, previewKey);
        const dir = path.dirname(previewFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(previewFilePath, previewBuffer);
        previewUrl = `http://localhost:5001/api/media/mock-files/${previewKey}`;
      } else {
        // Upload preview buffer to S3
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: previewKey,
          Body: previewBuffer,
          ContentType: mimeType,
        });
        await s3Client.send(putCommand);
        previewUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${previewKey}`;
      }
    }

    // 4. Save Media metadata in DB
    const media = await Media.create({
      url: previewUrl,
      originalKey: key,
      fileName: path.basename(key),
      mimeType,
      event: eventId,
      uploadedBy: req.user._id,
      isPublic,
      faceMatches: matchedUserIds,
      tags,
      likes: [],
      comments: [],
      friendTags: []
    });

    // 5. Send notifications to matched members
    for (const userId of matchedUserIds) {
      // Don't notify the uploader themselves
      if (userId.toString() === req.user._id.toString()) continue;

      const notif = await Notification.create({
        recipient: userId,
        sender: req.user._id,
        type: 'Tag',
        message: `You were tagged by AI in a new photo in the event "${event.title}"!`,
        media: media._id,
        event: event._id,
      });

      // Socket notification
      if (req.io) {
        req.io.to(userId.toString()).emit('notification', {
          _id: notif._id,
          type: 'Tag',
          message: notif.message,
          media: { _id: media._id, url: media.url },
          createdAt: notif.createdAt
        });
      }
    }

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all media for a specific event
// @route   GET /api/media/event/:eventId
// @access  Private/Public
router.get('/event/:eventId', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Access control: if event is private (simplified here, but check if Club Member of this club or Admin)
    // For now, allow viewing previews.

    const mediaList = await Media.find({ event: req.params.eventId })
      .populate('uploadedBy', 'name email role')
      .populate('faceMatches', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: mediaList.length, data: mediaList });
  } catch (error) {
    console.error('Error fetching event media:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all media matched for the logged-in user
// @route   GET /api/media/matched
// @access  Private
router.get('/matched', protect, async (req, res) => {
  try {
    const mediaList = await Media.find({ faceMatches: req.user._id })
      .populate('uploadedBy', 'name email role')
      .populate('event', 'title date clubName')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: mediaList.length, data: mediaList });
  } catch (error) {
    console.error('Error fetching matched media:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Toggle like on media
// @route   POST /api/media/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).populate('event', 'title');
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    const likeIdx = media.likes.indexOf(req.user._id);
    let isLiked = false;

    if (likeIdx > -1) {
      // Unlike
      media.likes.splice(likeIdx, 1);
    } else {
      // Like
      media.likes.push(req.user._id);
      isLiked = true;

      // Trigger notification to media owner (photographer/uploader)
      if (media.uploadedBy.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: media.uploadedBy,
          sender: req.user._id,
          type: 'Like',
          message: `${req.user.name} liked your photo in event "${media.event.title}".`,
          media: media._id,
          event: media.event._id,
        });

        if (req.io) {
          req.io.to(media.uploadedBy.toString()).emit('notification', {
            _id: notif._id,
            type: 'Like',
            message: notif.message,
            media: { _id: media._id, url: media.url },
            createdAt: notif.createdAt
          });
        }
      }
    }

    await media.save();
    res.json({ success: true, likesCount: media.likes.length, isLiked });
  } catch (error) {
    console.error('Error liking media:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Comment on media
// @route   POST /api/media/:id/comment
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'Comment text is required' });
  }

  try {
    const media = await Media.findById(req.params.id).populate('event', 'title');
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    const comment = {
      user: req.user._id,
      name: req.user.name,
      text,
      createdAt: new Date()
    };

    media.comments.push(comment);
    await media.save();

    // Trigger notification to media uploader
    if (media.uploadedBy.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        recipient: media.uploadedBy,
        sender: req.user._id,
        type: 'Comment',
        message: `${req.user.name} commented on your photo in "${media.event.title}": "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        media: media._id,
        event: media.event._id,
      });

      if (req.io) {
        req.io.to(media.uploadedBy.toString()).emit('notification', {
          _id: notif._id,
          type: 'Comment',
          message: notif.message,
          media: { _id: media._id, url: media.url },
          createdAt: notif.createdAt
        });
      }
    }

    res.json({ success: true, comments: media.comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Manually tag a friend in a photo
// @route   POST /api/media/:id/tag
// @access  Private
router.post('/:id/tag', protect, async (req, res) => {
  const { friendEmail, name, x, y } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required to tag' });
  }

  try {
    const media = await Media.findById(req.params.id).populate('event', 'title');
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    let taggedUser = null;
    if (friendEmail) {
      taggedUser = await User.findOne({ email: friendEmail });
    }

    const newTag = {
      user: taggedUser ? taggedUser._id : undefined,
      name: taggedUser ? taggedUser.name : name,
      x: x || 50,
      y: y || 50
    };

    media.friendTags.push(newTag);
    await media.save();

    // Trigger notification if a registered user was tagged
    if (taggedUser && taggedUser._id.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        recipient: taggedUser._id,
        sender: req.user._id,
        type: 'Tag',
        message: `${req.user.name} tagged you in a photo in event "${media.event.title}".`,
        media: media._id,
        event: media.event._id,
      });

      if (req.io) {
        req.io.to(taggedUser._id.toString()).emit('notification', {
          _id: notif._id,
          type: 'Tag',
          message: notif.message,
          media: { _id: media._id, url: media.url },
          createdAt: notif.createdAt
        });
      }
    }

    res.json({ success: true, friendTags: media.friendTags });
  } catch (error) {
    console.error('Error tagging friend:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Download media, generating dynamic watermarking based on role/permissions
// @route   GET /api/media/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).populate('event', 'title clubName');
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    let originalBuffer;

    // Fetch original image buffer
    if (IS_MOCK) {
      const filePath = path.join(UPLOADS_DIR, media.originalKey);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Original file not found in local mock storage' });
      }
      originalBuffer = fs.readFileSync(filePath);
    } else {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: media.originalKey,
      });
      const s3Response = await s3Client.send(getCommand);
      originalBuffer = await streamToBuffer(s3Response.Body);
    }

    // Role-based Watermarking:
    // - Admin and the uploader Photographer get clean originals (no watermark, or lightweight corner stamp)
    // - Club Members and Viewers get dynamic watermarked originals based on: Club Name, Event Name, User Role, and User Name.
    const isUploader = media.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    
    let downloadBuffer = originalBuffer;

    if (!isAdmin && !isUploader) {
      // Dynamic watermark generation
      downloadBuffer = await applyWatermark(
        originalBuffer,
        media.event.clubName,
        media.event.title,
        req.user.role,
        req.user.name
      );
      console.log(`[WATERMARK] Dynamic watermark applied for download by ${req.user.name} (${req.user.role})`);
    } else {
      console.log(`[CLEAN DOWNLOAD] Bypassed watermark for ${req.user.name} (Role: ${req.user.role})`);
    }

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="watermarked-${media.fileName}"`);
    res.send(downloadBuffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
