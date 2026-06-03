import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Admin only)
router.post('/', protect, authorize('Admin'), async (req, res) => {
  const { title, description, date, location, category, clubName } = req.body;

  if (!title || !description || !date || !location || !category || !clubName) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      clubName,
      createdBy: req.user._id,
      invitedPhotographers: [],
      attendees: [],
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all events (filtered by permissions and sorted)
// @route   GET /api/events
// @access  Public/Private
router.get('/', protect, async (req, res) => {
  try {
    const { sort = 'date', order = 'desc', category, search } = req.query;

    // Filter events based on role:
    // - Admin: see all
    // - Photographer: see events where they are invited or created
    // - Club Member: see events from their club or public events
    // - Viewer: see all public events (or all events in this mock setup, but we scope it)
    let query = {};

    if (req.user.role === 'Photographer') {
      query = {
        $or: [
          { invitedPhotographers: req.user._id },
          { createdBy: req.user._id }
        ]
      };
    } else if (req.user.role === 'Club Member') {
      query = {
        $or: [
          { clubName: req.user.clubName },
          // Allow viewing others if public, but for simplicity they see their club's events and others
        ]
      };
    }

    // Apply category filter if provided
    if (category) {
      query.category = category;
    }

    // Apply search filter if provided
    if (search) {
      query.$or = [
        ...(query.$or || []),
        { title: { $regex: search, $options: 'i' } },
        { clubName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sorting options
    let sortOption = {};
    if (sort === 'title' || sort === 'name') {
      sortOption.title = order === 'asc' ? 1 : -1;
    } else if (sort === 'category') {
      sortOption.category = order === 'asc' ? 1 : -1;
    } else {
      // Default to sorting by date
      sortOption.date = order === 'asc' ? 1 : -1;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email clubName')
      .populate('invitedPhotographers', 'name email')
      .sort(sortOption);

    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get details of a specific event
// @route   GET /api/events/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email clubName')
      .populate('invitedPhotographers', 'name email')
      .populate('attendees', 'name email faceId profilePicture');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Invite photographer to an event
// @route   POST /api/events/:id/invite-photographer
// @access  Private (Admin of event only)
router.post('/:id/invite-photographer', protect, authorize('Admin'), async (req, res) => {
  const { photographerEmail } = req.body;

  if (!photographerEmail) {
    return res.status(400).json({ success: false, message: 'Photographer email is required' });
  }

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Verify requesting admin created the event
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage invites for this event' });
    }

    const photographer = await User.findOne({ email: photographerEmail, role: 'Photographer' });
    if (!photographer) {
      return res.status(404).json({ success: false, message: 'Photographer user not found with this email' });
    }

    // Check if already invited
    if (event.invitedPhotographers.includes(photographer._id)) {
      return res.status(400).json({ success: false, message: 'Photographer is already invited' });
    }

    event.invitedPhotographers.push(photographer._id);
    await event.save();

    res.json({ success: true, message: 'Photographer invited successfully', data: event });
  } catch (error) {
    console.error('Error inviting photographer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    RSVP to an event
// @route   POST /api/events/:id/rsvp
// @access  Private (Club Member / Viewer)
router.post('/:id/rsvp', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if already RSVP'd
    if (event.attendees.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already RSVP\'d to this event' });
    }

    event.attendees.push(req.user._id);
    await event.save();

    res.json({ success: true, message: 'RSVP successful', data: event });
  } catch (error) {
    console.error('Error in event RSVP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
