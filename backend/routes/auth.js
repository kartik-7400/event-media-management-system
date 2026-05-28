import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { getUploadPresignedUrl, indexFaceSelfie, IS_MOCK, s3Client, BUCKET_NAME } from '../utils/awsHelper.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-jwt-key';

// Helper to sign JWT
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role, clubName } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Viewer',
      clubName: role === 'Admin' || role === 'Club Member' ? clubName : '',
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          clubName: user.clubName,
          token: generateToken(user._id),
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          clubName: user.clubName,
          profilePicture: user.profilePicture,
          faceId: user.faceId,
          token: generateToken(user._id),
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Request upload S3 URL for profile selfie
// @route   POST /api/auth/selfie-upload-url
// @access  Private
router.post('/selfie-upload-url', protect, async (req, res) => {
  const { contentType } = req.body;
  
  if (!contentType) {
    return res.status(400).json({ success: false, message: 'contentType is required' });
  }

  try {
    const key = `selfies/${req.user._id}-${Date.now()}`;
    const presignedData = await getUploadPresignedUrl(key, contentType);
    
    res.json({ success: true, data: presignedData });
  } catch (error) {
    console.error('Error generating selfie upload URL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Confirm selfie upload & trigger Rekognition Indexing
// @route   POST /api/auth/confirm-selfie
// @access  Private
router.post('/confirm-selfie', protect, async (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ success: false, message: 'key is required' });
  }

  try {
    let imageBuffer;

    if (IS_MOCK) {
      // In mock mode, check if the file is in local uploads folder
      const localFilePath = path.join(path.resolve('uploads'), key);
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ success: false, message: 'Uploaded file not found in local mock storage' });
      }
      imageBuffer = fs.readFileSync(localFilePath);
    } else {
      // Fetch buffer from AWS S3
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      const s3Response = await s3Client.send(getCommand);
      
      const streamToBuffer = (stream) => new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });

      imageBuffer = await streamToBuffer(s3Response.Body);
    }

    // Index face in Rekognition face collection
    const faceId = await indexFaceSelfie(imageBuffer, key);

    // Save S3 key/url and FaceId to database
    const profilePictureUrl = IS_MOCK 
      ? `http://localhost:5001/api/media/mock-files/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePicture: profilePictureUrl,
        profilePictureOriginalKey: key,
        faceId: faceId
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Selfie uploaded and indexed successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error confirming selfie upload:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
