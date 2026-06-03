import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Camera, UserPlus, Filter, Image as ImageIcon, Heart, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
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
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="glass-card mb-8">
          <div className="skeleton h-5 w-24 mb-4"></div>
          <div className="skeleton h-8 w-2/3 mb-4"></div>
          <div className="flex gap-4">
            <div className="skeleton h-4 w-32"></div>
            <div className="skeleton h-4 w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton aspect-[4/3] rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="text-error text-sm font-medium">Event not found.</p>
        <Link to="/dashboard" className="btn btn-secondary mt-4">Back to Dashboard</Link>
      </div>
    );
  }

  const scopeTabBase = "px-3.5 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer";
  const scopeTabActive = `${scopeTabBase} bg-primary text-white`;
  const scopeTabInactive = `${scopeTabBase} text-text-secondary hover:text-text-primary hover:bg-white/[0.04]`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Event Header Banner */}
      <div className="glass-card mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge badge-primary">
                {event.category}
              </span>
              <span className="text-xs text-text-muted font-medium">Hosted by {event.clubName}</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary mb-4" style={{ letterSpacing: '-0.02em' }}>{event.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-warning" />
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

        <p className="text-sm text-text-secondary mt-6 border-t border-border-color pt-4 leading-relaxed">
          {event.description}
        </p>

        {/* Invited Photographers list */}
        {event.invitedPhotographers && event.invitedPhotographers.length > 0 && (
          <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
            <Camera size={12} className="text-primary" />
            <span className="font-semibold">Photographers:</span>
            <div className="flex gap-2">
              {event.invitedPhotographers.map(p => (
                <span key={p._id} className="bg-bg-tertiary px-2.5 py-0.5 rounded-md border border-border-color text-text-secondary">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Media Upload system for photographers / hosts */}
      {isUploader && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Camera size={18} className="text-primary" /> Add Media Files
          </h2>
          <FileDropzone eventId={event._id} onUploadSuccess={fetchEventMedia} />
        </div>
      )}

      {/* Media Gallery Section */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <ImageIcon size={18} className="text-primary" /> Event Album ({mediaList.length} items)
          </h2>

          {/* Scope Filters — grouped in container with active indicator */}
          <div className="flex items-center gap-1 bg-bg-tertiary border border-border-color p-1 rounded-md">
            <button 
              className={scopeFilter === 'all' ? scopeTabActive : scopeTabInactive}
              onClick={() => setScopeFilter('all')}
            >
              All
            </button>
            {user.role === 'Club Member' && (
              <button 
                className={scopeFilter === 'my-photos' ? scopeTabActive : scopeTabInactive}
                onClick={() => setScopeFilter('my-photos')}
              >
                <span className="flex items-center gap-1">
                  <Sparkles size={12} /> My Photos
                </span>
              </button>
            )}
            <button 
              className={scopeFilter === 'public' ? scopeTabActive : scopeTabInactive}
              onClick={() => setScopeFilter('public')}
            >
              Public
            </button>
            {isUploader && (
              <button 
                className={scopeFilter === 'private' ? scopeTabActive : scopeTabInactive}
                onClick={() => setScopeFilter('private')}
              >
                Private
              </button>
            )}
          </div>
        </div>

        {/* AI Tag filter strip */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-bg-tertiary/50 border border-border-color rounded-md">
            <span className="text-xs text-text-muted font-bold flex items-center gap-1">
              <Filter size={12} /> Filter by AI Tags:
            </span>
            <button 
              className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${!searchTag ? 'bg-primary-muted border-primary/20 text-primary font-semibold' : 'bg-transparent border-border-color text-text-secondary hover:text-text-primary'}`}
              onClick={() => setSearchTag('')}
            >
              All
            </button>
            {availableTags.map(tag => (
              <button 
                key={tag}
                className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${searchTag === tag ? 'bg-primary-muted border-primary/20 text-primary font-semibold' : 'bg-transparent border-border-color text-text-secondary hover:text-text-primary'}`}
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
                  className="group relative aspect-[4/3] rounded-md overflow-hidden bg-black border border-border-color cursor-pointer hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
                  onClick={() => setActiveMediaId(media._id)}
                >
                  {isVideo ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt="Event media" className="w-full h-full object-cover" />
                  )}

                  {/* Gradient overlay on hover — smooth from transparent to dark */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-between p-4 transition-opacity duration-300">
                    <div className="flex justify-between items-start">
                      {!media.isPublic && (
                        <span className="badge badge-warning text-[9px]">
                          Private
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-white text-xs font-semibold">
                      <div className="flex gap-3">
                        <span className={`flex items-center gap-1 ${hasLiked ? 'text-error' : ''}`}>
                          <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} /> {totalLikes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} /> {totalComments}
                        </span>
                      </div>
                      
                      <span className="text-[10px] text-white/60 truncate max-w-[100px]">
                        By {media.uploadedBy?.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 glass-card flex flex-col items-center">
            <ImageIcon size={48} className="text-text-muted mb-4" />
            <p className="text-sm text-text-secondary font-medium">No photos or videos found in this album.</p>
            <p className="text-xs text-text-muted mt-1">Upload some media or adjust your filters.</p>
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
          <div className="mb-4 p-3 rounded-md bg-error-muted border border-error/15 text-error text-xs font-bold text-center">
            {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div className="mb-4 p-3 rounded-md bg-success-muted border border-success/15 text-success text-xs font-bold text-center">
            {inviteSuccess}
          </div>
        )}
        <form onSubmit={handleInvitePhotographer}>
          <div className="form-group">
            <label htmlFor="invite-email">Photographer Email</label>
            <input 
              id="invite-email"
              type="email" 
              className="form-control"
              placeholder="photographer@studio.com"
              value={photographerEmail}
              onChange={(e) => setPhotographerEmail(e.target.value)}
              required
            />
            <span className="text-[11px] text-text-muted mt-1 block">
              The photographer must already have registered an account on the platform with the Photographer role.
            </span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-2"
            disabled={inviting}
          >
            {inviting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Inviting...
              </>
            ) : (
              'Send Invitation'
            )}
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
