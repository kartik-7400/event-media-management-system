import express from 'express';
import Media from '../models/Media.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { getUploadPresignedUrl, getDownloadPresignedUrl } from '../utils/awsHelper.js';
import { confirmAndProcessUpload, processMediaDownload } from '../services/mediaService.js';

const router = express.Router();

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
    const media = await confirmAndProcessUpload({
      key,
      eventId,
      userId: req.user._id,
      isPublic,
      io: req.io
    });
    res.status(201).json({ success: true, data: media });
  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
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
    const { buffer, mimeType, fileName } = await processMediaDownload({
      mediaId: req.params.id,
      user: req.user
    });

    res.setHeader('Content-Type', mimeType);
    // Sanitize filename to prevent ERR_INVALID_CHAR from non-ASCII characters
    const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, '_');
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Disposition', `attachment; filename="watermarked-${asciiFileName}"; filename*=UTF-8''watermarked-${encodedFileName}`);
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

// @desc    Toggle media in user's favourites list
// @route   POST /api/media/:id/favourite
// @access  Private
router.post('/:id/favourite', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const mediaId = req.params.id;

    const favIdx = user.favourites.indexOf(mediaId);
    let isFavourite = false;

    if (favIdx > -1) {
      user.favourites.splice(favIdx, 1);
    } else {
      user.favourites.push(mediaId);
      isFavourite = true;
    }

    await user.save();
    res.json({ success: true, isFavourite, favouritesCount: user.favourites.length });
  } catch (error) {
    console.error('Error toggling favourite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all favourite media for user
// @route   GET /api/media/favourites/list
// @access  Private
router.get('/favourites/list', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favourites',
      populate: [
        { path: 'event', select: 'title date clubName' },
        { path: 'uploadedBy', select: 'name email role' }
      ]
    });

    res.json({ success: true, count: user.favourites.length, data: user.favourites });
  } catch (error) {
    console.error('Error fetching favourite media list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get detailed media by id
// @route   GET /api/media/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'name email role')
      .populate('faceMatches', 'name email profilePicture')
      .populate('event', 'title clubName');

    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    res.json({ success: true, data: media });
  } catch (error) {
    console.error('Error fetching media details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
