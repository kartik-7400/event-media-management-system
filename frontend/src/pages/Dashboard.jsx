import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, Search, SlidersHorizontal, Check, Loader2, FolderOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import DatePicker from '../components/DatePicker';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'title' | 'category'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'Other',
    clubName: user?.clubName || ''
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchEvents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/api/events?sort=${sortBy}&order=${sortOrder}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [token, sortBy, sortOrder, categoryFilter, searchQuery]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { title, description, date, location, category, clubName } = newEvent;

    if (!title || !description || !date || !location || !category || !clubName) {
      setFormError('Please fill in all fields');
      return;
    }

    setFormError('');
    setFormSubmitting(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEvent)
      });
      const result = await res.json();

      if (result.success) {
        setEvents(prev => [result.data, ...prev]);
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          date: '',
          location: '',
          category: 'Other',
          clubName: user?.clubName || ''
        });
      } else {
        setFormError(result.message || 'Failed to create event');
      }
    } catch (err) {
      setFormError('Network error. Failed to create event.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRSVP = async (eventId, index) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        // Update local events array
        setEvents(prev => 
          prev.map((e, idx) => idx === index ? { ...e, attendees: [...e.attendees, user._id] } : e)
        );
      }
    } catch (error) {
      console.error('Error RSVPing to event:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
            Hello, <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {user.role === 'Admin' ? `Admin Dashboard for ${user.clubName}` : `Welcome to your EventMediaHub feed`}
          </p>
        </div>

        {user.role === 'Admin' && (
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setNewEvent(prev => ({ ...prev, clubName: user.clubName }));
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} /> Create Event
          </button>
        )}
      </div>

      {/* Control panel: Search, Sorting, Filtering */}
      <div className="glass-card mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-[320px]">
          <input 
            type="text" 
            placeholder="Search events, clubs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control pl-10"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        </div>

        {/* Category Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-text-muted" />
            <Dropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              size="sm"
              width="w-[140px]"
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                { value: 'Sports', label: 'Sports' },
                { value: 'Graduation', label: 'Graduation' },
                { value: 'Party', label: 'Party' },
                { value: 'Wedding', label: 'Wedding' },
                { value: 'Conference', label: 'Conference' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Sort:</span>
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              size="sm"
              width="w-[120px]"
              options={[
                { value: 'date', label: 'Date' },
                { value: 'title', label: 'Event Name' },
                { value: 'category', label: 'Category' },
              ]}
            />
            <Dropdown
              value={sortOrder}
              onChange={setSortOrder}
              size="sm"
              width="w-[90px]"
              options={[
                { value: 'desc', label: 'Desc' },
                { value: 'asc', label: 'Asc' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card">
              <div className="skeleton h-4 w-20 mb-4"></div>
              <div className="skeleton h-6 w-3/4 mb-3"></div>
              <div className="skeleton h-3 w-full mb-2"></div>
              <div className="skeleton h-3 w-2/3 mb-6"></div>
              <div className="skeleton h-3 w-1/2 mb-2"></div>
              <div className="skeleton h-3 w-1/3 mb-6"></div>
              <div className="flex gap-3 pt-4 border-t border-border-color">
                <div className="skeleton h-9 flex-1"></div>
                <div className="skeleton h-9 flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => {
            const hasJoined = event.attendees.includes(user._id);
            const isEventAdmin = event.createdBy?._id === user._id || event.createdBy === user._id;

            return (
              <div key={event._id} className="glass-card hover:glass-card-hover flex flex-col justify-between h-full">
                <div>
                  {/* Category + Club */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="badge badge-primary">
                      {event.category}
                    </span>
                    <span className="text-xs text-text-muted font-medium">{event.clubName}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-text-primary mb-2">
                    <Link to={`/event/${event._id}`} className="hover:text-primary transition-colors duration-200">
                      {event.title}
                    </Link>
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-text-secondary line-clamp-3 mb-4 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-col gap-2 text-xs text-text-secondary border-t border-border-color pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-warning" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex gap-3 border-t border-border-color pt-4 mt-4">
                  <Link to={`/event/${event._id}`} className="btn btn-secondary flex-1 text-xs py-2.5">
                    View Album
                  </Link>

                  {user.role === 'Club Member' && !hasJoined && (
                    <button 
                      onClick={() => handleRSVP(event._id, index)} 
                      className="btn btn-primary flex-1 text-xs py-2.5"
                    >
                      RSVP Join
                    </button>
                  )}

                  {user.role === 'Club Member' && hasJoined && (
                    <div className="inline-flex items-center justify-center gap-1.5 flex-1 bg-success-muted border border-success/15 text-success text-xs font-semibold rounded-md px-4 py-2.5">
                      <Check size={14} /> Attended
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 glass-card flex flex-col items-center">
          <FolderOpen size={48} className="text-text-muted mb-4" />
          <p className="text-text-secondary text-sm font-medium">No events found matching current criteria.</p>
          <p className="text-text-muted text-xs mt-1">Try adjusting your filters or search query.</p>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Create New Event"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-md bg-error-muted border border-error/15 text-error text-xs font-bold text-center">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label htmlFor="event-title">Event Title</label>
            <input 
              id="event-title"
              type="text" 
              className="form-control"
              placeholder="Graduation Ceremony 2026"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-desc">Description</label>
            <textarea 
              id="event-desc"
              className="form-control"
              rows={3}
              placeholder="Details about the event uploads and photographer guidelines..."
              value={newEvent.description}
              onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Date</label>
              <DatePicker
                value={newEvent.date}
                onChange={(val) => setNewEvent(prev => ({ ...prev, date: val }))}
                placeholder="Pick event date"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <Dropdown
                value={newEvent.category}
                onChange={(val) => setNewEvent(prev => ({ ...prev, category: val }))}
                options={[
                  { value: 'Sports', label: 'Sports' },
                  { value: 'Graduation', label: 'Graduation' },
                  { value: 'Party', label: 'Party' },
                  { value: 'Wedding', label: 'Wedding' },
                  { value: 'Conference', label: 'Conference' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="event-location">Location</label>
            <input 
              id="event-location"
              type="text" 
              className="form-control"
              placeholder="Campus Auditorium"
              value={newEvent.location}
              onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-club">Club Host</label>
            <input 
              id="event-club"
              type="text" 
              className="form-control"
              value={newEvent.clubName}
              onChange={(e) => setNewEvent(prev => ({ ...prev, clubName: e.target.value }))}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-2"
            disabled={formSubmitting}
          >
            {formSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Event...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
