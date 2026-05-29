import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Camera, UserPlus, Filter, Sparkles, Image as ImageIcon, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FileDropzone from '../components/FileDropzone';
import Lightbox from '../components/Lightbox';
import Modal from '../components/Modal';

const EventDetails = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMediaId, setActiveMediaId] = useState(null);
  
  // Tag Invite photographer state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [photographerEmail, setPhotographerEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  // Filters
  const [searchTag, setSearchTag] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'my-photos' | 'public' | 'private'
  const [availableTags, setAvailableTags] = useState([]);

  const fetchEventDetails = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setEvent(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEventMedia = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/media/event/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setMediaList(result.data);
        
        // Extract unique labels/tags from all media
        const tagsSet = new Set();
        result.data.forEach(media => {
          if (media.tags) {
            media.tags.forEach(tag => tagsSet.add(tag));
          }
        });
        setAvailableTags(Array.from(tagsSet));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEventDetails(), fetchEventMedia()]);
      setLoading(false);
    };
    if (id && token) {
      init();
    }
  }, [id, token]);

  const handleInvitePhotographer = async (e) => {
    e.preventDefault();
    if (!photographerEmail) return;
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);

    try {
      const res = await fetch(`/api/events/${id}/invite-photographer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ photographerEmail })
      });
      const result = await res.json();
      if (result.success) {
        setInviteSuccess('Photographer invited successfully!');
        setPhotographerEmail('');
        fetchEventDetails();
      } else {
        setInviteError(result.message || 'Failed to invite photographer');
      }
    } catch (err) {
      setInviteError('Network error');
    } finally {
      setInviting(false);
    }
  };

  // Filter logic
  const filteredMedia = mediaList.filter(item => {
    // 1. Tag filter
    if (searchTag && !item.tags.includes(searchTag.toLowerCase())) {
      return false;
    }

    // 2. Scope filter (All, My Photos, Public, Private)
    if (scopeFilter === 'my-photos') {
      const isMatched = item.faceMatches?.some(m => m._id === user._id || m === user._id);
      if (!isMatched) return false;
    } else if (scopeFilter === 'public' && !item.isPublic) {
      return false;
    } else if (scopeFilter === 'private' && item.isPublic) {
      return false;
    }

    return true;
  });

  const isUploader = event?.invitedPhotographers?.some(p => p._id === user?._id) || event?.createdBy?._id === user?._id || user?.role === 'Admin';

  if (loading) {
    return <div className="text-center py-20 text-text-muted animate-pulse">Loading event album...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="text-error">Event not found.</p>
        <Link to="/dashboard" className="btn btn-secondary mt-4">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Event Header Banner */}
      <div className="glass-card mb-8 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
                {event.category}
              </span>
              <span className="text-xs text-text-secondary font-bold">Hosted by {event.clubName}</span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-extrabold font-heading text-text-primary mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-accent" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {user.role === 'Admin' && event.createdBy?._id === user._id && (
              <button className="btn btn-secondary text-xs" onClick={() => setShowInviteModal(true)}>
                <UserPlus size={16} /> Invite Photographer
              </button>
            )}
            
            <Link to="/dashboard" className="btn btn-secondary text-xs">
              Back to Feed
            </Link>
          </div>
        </div>

        <p className="text-sm text-text-secondary mt-6 border-t border-white/5 pt-4 leading-relaxed">
          {event.description}
        </p>

        {/* Invited Photographers list */}
        {event.invitedPhotographers && event.invitedPhotographers.length > 0 && (
          <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
            <Camera size={12} className="text-primary" />
            <span className="font-semibold">Photographers:</span>
            <div className="flex gap-2">
              {event.invitedPhotographers.map(p => (
                <span key={p._id} className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Media Upload system for photographers / hosts */}
      {isUploader && (
        <div className="mb-8">
          <h2 className="text-xl font-bold font-heading text-text-primary mb-4 flex items-center gap-2">
            <Camera size={20} className="text-primary" /> Add Media Files
          </h2>
          <FileDropzone eventId={event._id} onUploadSuccess={fetchEventMedia} />
        </div>
      )}

      {/* Media Gallery Section */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
            <ImageIcon size={20} className="text-accent" /> Event Album ({mediaList.length} items)
          </h2>

          {/* Scope Filters */}
          <div className="flex items-center gap-2 bg-white/2 border border-white/5 p-1 rounded-md text-xs font-semibold">
            <button 
              className={`px-3 py-1.5 rounded-sm transition-all ${scopeFilter === 'all' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
              onClick={() => setScopeFilter('all')}
            >
              All
            </button>
            {user.role === 'Club Member' && (
              <button 
                className={`px-3 py-1.5 rounded-sm transition-all flex items-center gap-1 ${scopeFilter === 'my-photos' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                onClick={() => setScopeFilter('my-photos')}
              >
                <Sparkles size={12} /> My Photos
              </button>
            )}
            <button 
              className={`px-3 py-1.5 rounded-sm transition-all ${scopeFilter === 'public' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
              onClick={() => setScopeFilter('public')}
            >
              Public
            </button>
            {isUploader && (
              <button 
                className={`px-3 py-1.5 rounded-sm transition-all ${scopeFilter === 'private' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                onClick={() => setScopeFilter('private')}
              >
                Private
              </button>
            )}
          </div>
        </div>

        {/* Unique label filter tags strip */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-bg-secondary/40 border border-white/5 rounded-md">
            <span className="text-xs text-text-muted font-bold flex items-center gap-1">
              <Filter size={12} /> Filter by AI Tags:
            </span>
            <button 
              className={`text-xs px-2.5 py-1 rounded-full border ${!searchTag ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'}`}
              onClick={() => setSearchTag('')}
            >
              All
            </button>
            {availableTags.map(tag => (
              <button 
                key={tag}
                className={`text-xs px-2.5 py-1 rounded-full border ${searchTag === tag ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'}`}
                onClick={() => setSearchTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        {filteredMedia.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMedia.map(media => {
              const isVideo = media.mimeType.startsWith('video/');
              const totalLikes = media.likes?.length || 0;
              const totalComments = media.comments?.length || 0;
              const hasLiked = media.likes?.includes(user._id);

              return (
                <div 
                  key={media._id}
                  className="group relative aspect-[4/3] rounded-md overflow-hidden bg-black border border-white/5 cursor-pointer shadow-lg hover:border-primary/40 hover:scale-[1.02] hover:shadow-primary/5 transition-all duration-300"
                  onClick={() => setActiveMediaId(media._id)}
                >
                  {isVideo ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt="event-thumbnail" className="w-full h-full object-cover" />
                  )}

                  {/* Dark transparent overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-4 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      {!media.isPublic && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-accent/20 border border-accent/40 text-accent rounded">
                          Private
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-white text-xs font-semibold">
                      <div className="flex gap-3">
                        <span className={`flex items-center gap-1 ${hasLiked ? 'text-accent' : ''}`}>
                          <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} /> {totalLikes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} /> {totalComments}
                        </span>
                      </div>
                      
                      <span className="text-[10px] text-text-secondary truncate max-w-[100px]">
                        By {media.uploadedBy?.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 glass-card">
            <p className="text-sm text-text-secondary">No photos or videos found in this album.</p>
          </div>
        )}
      </div>

      {/* INVITE PHOTOGRAPHER MODAL */}
      <Modal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)}
        title="Invite Photographer"
      >
        {inviteError && (
          <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-xs font-bold text-center">
            {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div className="mb-4 p-3 rounded bg-success/10 border border-success/20 text-success text-xs font-bold text-center">
            {inviteSuccess}
          </div>
        )}
        <form onSubmit={handleInvitePhotographer}>
          <div className="form-group">
            <label>Photographer Email</label>
            <input 
              type="email" 
              className="form-control"
              placeholder="photographer@studio.com"
              value={photographerEmail}
              onChange={(e) => setPhotographerEmail(e.target.value)}
              required
            />
            <span className="text-[11px] text-text-muted mt-2 block">
              The photographer must already have registered an account on the platform with the Photographer role.
            </span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4"
            disabled={inviting}
          >
            {inviting ? 'Inviting...' : 'Send Invitation'}
          </button>
        </form>
      </Modal>

      {/* LIGHTBOX POPUP DETAILS */}
      {activeMediaId && (
        <Lightbox 
          mediaId={activeMediaId} 
          onClose={() => setActiveMediaId(null)}
          onActionSuccess={fetchEventMedia}
        />
      )}
    </div>
  );
};

export default EventDetails;
