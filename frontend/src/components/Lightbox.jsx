import React, { useState, useEffect, useRef } from 'react';
import { Heart, Send, Download, X, User as UserIcon, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Lightbox = ({ mediaId, onClose, onActionSuccess }) => {
  const { user, token } = useAuth();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [favourited, setFavourited] = useState(user?.favourites?.includes(mediaId) || false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputCoords, setTagInputCoords] = useState({ x: 50, y: 50 });
  const [newTagName, setNewTagName] = useState('');
  const [newTagEmail, setNewTagEmail] = useState('');
  const imageContainerRef = useRef(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/media/${mediaId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
          setMedia(result.data);
          setLiked(result.data.likes.includes(user._id));
        }
      } catch (err) {
        console.error('Error fetching media details:', err);
      } finally {
        setLoading(false);
      }
    };
    if (mediaId && token) {
      fetchDetails();
    }
  }, [mediaId, token, user]);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/media/${mediaId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setMedia(prev => ({
          ...prev,
          likes: result.isLiked 
            ? [...prev.likes, user._id] 
            : prev.likes.filter(id => id !== user._id)
        }));
        setLiked(result.isLiked);
        if (onActionSuccess) onActionSuccess();
      }
    } catch (err) {
      console.error('Error liking media:', err);
    }
  };
  const handleFavourite = async () => {
    try {
      const res = await fetch(`/api/media/${mediaId}/favourite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setFavourited(result.isFavourite);
        if (onActionSuccess) onActionSuccess();
      }
    } catch (err) {
      console.error('Error toggling favourite:', err);
    }
  };
  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/media/${mediaId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });
      const result = await res.json();
      if (result.success) {
        setMedia(prev => ({ ...prev, comments: result.comments }));
        setCommentText('');
        if (onActionSuccess) onActionSuccess();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleImageClick = (e) => {
    if (!imageContainerRef.current) return;
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTagInputCoords({ x, y });
    setShowTagInput(true);
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const res = await fetch(`/api/media/${mediaId}/tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          friendEmail: newTagEmail,
          name: newTagName,
          x: tagInputCoords.x,
          y: tagInputCoords.y
        })
      });
      const result = await res.json();
      if (result.success) {
        setMedia(prev => ({ ...prev, friendTags: result.friendTags }));
        setShowTagInput(false);
        setNewTagName('');
        setNewTagEmail('');
        if (onActionSuccess) onActionSuccess();
      }
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  const handleDownload = () => {
    if (!media) return;
    const link = document.createElement('a');
    link.href = `/api/media/${media._id}/download`;
    fetch(link.href, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `watermarked-${media.fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        console.error('Download error:', err);
        alert('Download failed.');
      });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-bg-primary/95 backdrop-blur-md flex justify-center items-center z-[1500] p-10">
        <div className="text-white text-lg font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!media) return null;

  return (
    <div 
      className="fixed inset-0 bg-bg-primary/95 backdrop-blur-md flex justify-center items-center z-[1500] p-4 md:p-10"
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-6 bg-white/5 border border-white/10 text-text-primary w-11 h-11 rounded-full flex items-center justify-center cursor-pointer hover:bg-error hover:text-white hover:rotate-95 transition-all duration-200 z-[1600]" 
        onClick={onClose}
      >
        <X size={24} />
      </button>
      
      <div 
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] w-full max-w-[1100px] h-[90vh] lg:h-[80vh] min-h-[500px] bg-bg-secondary rounded-lg overflow-hidden border border-white/5 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Window */}
        <div className="flex flex-col bg-black relative justify-center items-center overflow-hidden h-full min-h-[250px] lg:min-h-0">
          <div 
            className="relative w-full h-full flex items-center justify-center" 
            ref={imageContainerRef}
            onClick={handleImageClick}
          >
            {media.mimeType.startsWith('video/') ? (
              <video src={media.url} controls className="max-w-full max-h-full" />
            ) : (
              <img src={media.url} alt="lightbox-media" className="max-w-full max-h-full object-contain cursor-crosshair" />
            )}

            {/* Render Friend Tags Overlaid */}
            {media.friendTags && media.friendTags.map((tag, i) => (
              <div 
                key={i} 
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-3 h-3 bg-accent border-2 border-white rounded-full shadow-[0_0_10px_rgba(217,70,239,0.5)] animate-pulse"></div>
                  <span className="mt-1 bg-black/85 border border-white/15 text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                    {tag.name}
                  </span>
                </div>
              </div>
            ))}

            {/* Click-to-tag Input Dialog */}
            {showTagInput && (
              <div 
                className="absolute -translate-x-1/2 translate-y-3.5 w-[220px] p-3 z-30 bg-bg-tertiary border border-primary/30 rounded shadow-2xl"
                style={{ left: `${tagInputCoords.x}%`, top: `${tagInputCoords.y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleAddTag}>
                  <h5 className="text-xs font-bold text-text-primary mb-2">Tag User</h5>
                  <input 
                    type="text" 
                    placeholder="Friend's Name" 
                    value={newTagName} 
                    onChange={(e) => setNewTagName(e.target.value)}
                    required
                    className="w-full padding-2 bg-white/5 border border-white/10 rounded text-xs text-white p-2 mb-2 focus:outline-none focus:border-primary"
                  />
                  <input 
                    type="email" 
                    placeholder="Email (optional)" 
                    value={newTagEmail} 
                    onChange={(e) => setNewTagEmail(e.target.value)}
                    className="w-full padding-2 bg-white/5 border border-white/10 rounded text-xs text-white p-2 mb-2 focus:outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button type="submit" className="btn btn-primary btn-xs">Tag</button>
                    <button type="button" className="btn btn-secondary btn-xs" onClick={() => setShowTagInput(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-3 left-3 display-flex flex-wrap gap-2 z-10">
            {media.tags && media.tags.map((tag, i) => (
              <span key={i} className="bg-black/60 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-semibold text-text-secondary mr-1">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Social Sidebar */}
        <div className="flex flex-col bg-bg-secondary border-t lg:border-t-0 lg:border-l border-white/5 p-6 h-full overflow-hidden">
          <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
            <div className="w-9 h-9 rounded-full bg-bg-tertiary border border-primary flex items-center justify-center text-primary">
              <UserIcon size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">{media.uploadedBy?.name || 'Photographer'}</h4>
              <span className="text-[11px] text-text-secondary uppercase tracking-wider">{media.uploadedBy?.role || 'User'}</span>
            </div>
          </div>

          <div className="flex gap-2.5 mb-5">
            <button 
              className={`flex-1 flex items-center justify-center gap-1.5 p-2 bg-white/3 border border-white/6 rounded text-xs font-semibold text-text-secondary cursor-pointer hover:bg-white/8 hover:text-text-primary transition-all duration-200 ${liked ? 'text-accent! bg-accent/5! border-accent/30!' : ''}`} 
              onClick={handleLike}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span>{media.likes?.length || 0} Likes</span>
            </button>

            <button 
              className={`flex-1 flex items-center justify-center gap-1.5 p-2 bg-white/3 border border-white/6 rounded text-xs font-semibold text-text-secondary cursor-pointer hover:bg-white/8 hover:text-text-primary transition-all duration-200 ${favourited ? 'text-warning! bg-warning/5! border-warning/30!' : ''}`} 
              onClick={handleFavourite}
            >
              <Star size={16} fill={favourited ? 'currentColor' : 'none'} />
              <span>Fav</span>
            </button>
            
            <button className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-primary/5 border border-primary/30 rounded text-xs font-semibold text-primary cursor-pointer hover:bg-primary hover:text-white transition-all duration-200" onClick={handleDownload}>
              <Download size={16} />
              <span>Get</span>
            </button>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <h5 className="text-[13px] font-bold text-text-primary mb-3">Comments ({media.comments?.length || 0})</h5>
            
            <div className="flex-grow overflow-y-auto mb-4 pr-2 flex flex-col gap-3">
              {media.comments && media.comments.length > 0 ? (
                media.comments.map((comment, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.03] p-3 rounded">
                    <span className="text-xs font-bold text-text-primary block mb-1">{comment.name}</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{comment.text}</p>
                    <span className="text-[9px] text-text-muted block mt-1.5 text-right font-medium">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-text-muted text-xs my-auto">No comments yet.</div>
              )}
            </div>

            <form onSubmit={handleComment} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)}
                className="form-control pr-11"
              />
              <button type="submit" className="absolute right-3 bg-transparent border-none text-primary cursor-pointer hover:text-accent hover:scale-105 transition-all duration-200">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
