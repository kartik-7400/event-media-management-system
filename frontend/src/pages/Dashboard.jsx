import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, User, Shield, Film, Plus, Search, SlidersHorizontal, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

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
          <h1 className="text-3xl font-extrabold font-heading text-text-primary">
            Hello, <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="text-sm text-text-secondary">
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
      <div className="glass-card mb-8 p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
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
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control py-2 text-xs w-[130px]"
            >
              <option value="">All Categories</option>
              <option value="Sports">Sports</option>
              <option value="Graduation">Graduation</option>
              <option value="Party">Party</option>
              <option value="Wedding">Wedding</option>
              <option value="Conference">Conference</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Sort:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-control py-2 text-xs w-[110px]"
            >
              <option value="date">Date</option>
              <option value="title">Event Name</option>
              <option value="category">Category</option>
            </select>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="form-control py-2 text-xs w-[90px]"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse">Loading events feed...</div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => {
            const hasJoined = event.attendees.includes(user._id);
            const isEventAdmin = event.createdBy?._id === user._id || event.createdBy === user._id;

            return (
              <div key={event._id} className="glass-card hover:glass-card-hover flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
                      {event.category}
                    </span>
                    <span className="text-xs text-text-muted font-semibold">{event.clubName}</span>
                  </div>

                  <h3 className="text-xl font-bold text-text-primary mb-3">
                    <Link to={`/event/${event._id}`} className="hover:text-primary transition-all duration-200">
                      {event.title}
                    </Link>
                  </h3>
                  
                  <p className="text-xs text-text-secondary line-clamp-3 mb-6">
                    {event.description}
                  </p>

                  <div className="flex flex-col gap-2.5 text-xs text-text-secondary mb-6 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-accent" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-white/5 pt-4 mt-auto">
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
                    <div className="inline-flex items-center justify-center gap-1 flex-1 bg-success/10 border border-success/30 text-success text-xs font-semibold rounded px-4 py-2">
                      <Check size={14} /> Attended
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 glass-card">
          <p className="text-text-secondary text-sm">No events found matching current criteria.</p>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Create New Event"
      >
        {formError && (
          <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-xs font-bold text-center">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label>Event Title</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Graduation Ceremony 2026"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
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
              <input 
                type="date" 
                className="form-control"
                value={newEvent.date}
                onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select 
                className="form-control"
                value={newEvent.category}
                onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="Sports">Sports</option>
                <option value="Graduation">Graduation</option>
                <option value="Party">Party</option>
                <option value="Wedding">Wedding</option>
                <option value="Conference">Conference</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Campus Auditorium"
              value={newEvent.location}
              onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Club Host</label>
            <input 
              type="text" 
              className="form-control"
              value={newEvent.clubName}
              onChange={(e) => setNewEvent(prev => ({ ...prev, clubName: e.target.value }))}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Creating Event...' : 'Create Event'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
