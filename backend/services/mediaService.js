import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Media from '../models/Media.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { detectImageLabels, searchFaces, IS_MOCK, s3Client, BUCKET_NAME } from '../utils/awsHelper.js';
import { applyWatermark } from '../utils/watermark.js';
import sharp from 'sharp';

const UPLOADS_DIR = path.resolve('uploads');

// Utility to parse S3 body to buffer
const streamToBuffer = (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(Buffer.concat(chunks)));
});

/**
 * Confirms file upload and processes it (generates preview with watermark, runs AI labeling, face search, and triggers notifications).
 */
export const confirmAndProcessUpload = async ({ key, eventId, userId, isPublic = true, io }) => {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  let originalBuffer;
  let mimeType = key.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'; // simple check

  // 1. Get original file buffer
  if (IS_MOCK) {
    const localFilePath = path.join(UPLOADS_DIR, key);
    if (!fs.existsSync(localFilePath)) {
      const error = new Error('Uploaded file not found in local mock S3');
      error.status = 404;
      throw error;
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
    ? `/api/media/mock-files/${key}`
    : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

  // 2. Perform AI operations if image
  const isImage = mimeType.startsWith('image/');
  if (isImage) {
    // Normalize image format and rotation for AWS Rekognition compatibility
    let normalizedBuffer = originalBuffer;
    try {
      normalizedBuffer = await sharp(originalBuffer)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (sharpErr) {
      console.error('Sharp normalization error for event media:', sharpErr);
    }

    // AI Labels detection
    tags = await detectImageLabels(normalizedBuffer);

    // AI Facial recognition
    const matchedFaceIds = await searchFaces(normalizedBuffer);
    
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
      previewUrl = `/api/media/mock-files/${previewKey}`;
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
    uploadedBy: userId,
    isPublic,
    faceMatches: matchedUserIds,
    tags,
    likes: [],
    comments: [],
    friendTags: []
  });

  // 5. Send notifications to matched members
  for (const matchId of matchedUserIds) {
    // Don't notify the uploader themselves
    if (matchId.toString() === userId.toString()) continue;

    const notif = await Notification.create({
      recipient: matchId,
      sender: userId,
      type: 'Tag',
      message: `You were tagged by AI in a new photo in the event "${event.title}"!`,
      media: media._id,
      event: event._id,
    });

    // Socket notification
    if (io) {
      io.to(matchId.toString()).emit('notification', {
        _id: notif._id,
        type: 'Tag',
        message: notif.message,
        media: { _id: media._id, url: media.url },
        createdAt: notif.createdAt
      });
    }
  }

  return media;
};

/**
 * Handles dynamic role-based media downloads.
 */
export const processMediaDownload = async ({ mediaId, user }) => {
  const media = await Media.findById(mediaId).populate('event', 'title clubName');
  if (!media) {
    const error = new Error('Media not found');
    error.status = 404;
    throw error;
  }

  let originalBuffer;

  // Fetch original image buffer
  if (IS_MOCK) {
    const filePath = path.join(UPLOADS_DIR, media.originalKey);
    if (!fs.existsSync(filePath)) {
      const error = new Error('Original file not found in local mock storage');
      error.status = 404;
      throw error;
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
  // - Admin and the uploader Photographer get clean originals
  // - Club Members and Viewers get dynamic watermarked originals based on: Club Name, Event Name, User Role, and User Name.
  const isUploader = media.uploadedBy.toString() === user._id.toString();
  const isAdmin = user.role === 'Admin';
  
  let downloadBuffer = originalBuffer;

  if (!isAdmin && !isUploader) {
    // Dynamic watermark generation
    downloadBuffer = await applyWatermark(
      originalBuffer,
      media.event.clubName,
      media.event.title,
      user.role,
      user.name
    );
    console.log(`[WATERMARK] Dynamic watermark applied for download by ${user.name} (${user.role})`);
  } else {
    console.log(`[CLEAN DOWNLOAD] Bypassed watermark for ${user.name} (Role: ${user.role})`);
  }

  return {
    buffer: downloadBuffer,
    mimeType: media.mimeType,
    fileName: media.fileName
  };
};
