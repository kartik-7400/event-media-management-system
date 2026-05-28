import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Photographer', 'Club Member', 'Viewer'],
    default: 'Viewer',
  },
  profilePicture: {
    type: String, // Public preview S3 url
    default: '',
  },
  profilePictureOriginalKey: {
    type: String, // Private original S3 key
    default: '',
  },
  faceId: {
    type: String, // AWS Rekognition Face ID
    default: '',
  },
  clubName: {
    type: String, // Associates Admin or Club Member with a specific club
    default: '',
  },
  favourites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }]
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);
