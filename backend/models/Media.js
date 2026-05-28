import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const FriendTagSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  x: {
    type: Number, // Percentage coordinate (0 to 100)
    default: 0,
  },
  y: {
    type: Number, // Percentage coordinate (0 to 100)
    default: 0,
  }
});

const MediaSchema = new mongoose.Schema({
  url: {
    type: String, // Watermarked preview URL (S3 public URL or Local mock server URL)
    required: true,
  },
  originalKey: {
    type: String, // Private original key (S3 key or Local path)
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  faceMatches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String, // Auto-detected Rekognition tags (e.g. crowd, beach, sports)
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [CommentSchema],
  friendTags: [FriendTagSchema]
}, {
  timestamps: true,
});

export default mongoose.model('Media', MediaSchema);
