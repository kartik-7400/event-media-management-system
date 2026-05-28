import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Like', 'Comment', 'Tag', 'Invite', 'System'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  isRead: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

export default mongoose.model('Notification', NotificationSchema);
