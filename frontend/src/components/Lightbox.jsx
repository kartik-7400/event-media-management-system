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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-text-muted font-medium">Loading media...</span>
        </div>
      </div>
    );
  }

  if (!media) return null;

  const actionBtnBase = "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold cursor-pointer border transition-all duration-200";

  return (
    <div 
      className="fixed inset-0 bg-bg-primary/95 backdrop-blur-md flex justify-center items-center z-[1500] p-4 md:p-10"
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-text-secondary border border-border-color bg-bg-secondary/80 hover:bg-error hover:text-white hover:border-error transition-all duration-200 z-[1600]" 
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <X size={20} />
      </button>
      
      <div 
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] w-full max-w-[1100px] h-[90vh] lg:h-[80vh] min-h-[500px] bg-bg-secondary rounded-lg overflow-hidden border border-border-color shadow-2xl animate-fade-in-up"
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
              <img src={media.url} alt="Media preview" className="max-w-full max-h-full object-contain cursor-crosshair" />
            )}

            {/* Friend Tags Overlaid */}
            {media.friendTags && media.friendTags.map((tag, i) => (
              <div 
                key={i} 
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-3 h-3 bg-primary border-2 border-white rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                  <span className="mt-1 bg-black/85 border border-border-hover text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                    {tag.name}
                  </span>
                </div>
              </div>
            ))}

            {/* Click-to-tag Input Dialog */}
            {showTagInput && (
              <div 
                className="absolute -translate-x-1/2 translate-y-3.5 w-[220px] p-3 z-30 bg-bg-tertiary border border-primary/30 rounded-md shadow-2xl"
                style={{ left: `${tagInputCoords.x}%`, top: `${tagInputCoords.y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleAddTag}>
                  <h5 className="text-xs font-bold text-text-primary mb-2">Tag a Friend</h5>
                  <input 
                    type="text" 
                    placeholder="Friend's Name" 
                    value={newTagName} 
                    onChange={(e) => setNewTagName(e.target.value)}
                    required
                    className="form-control text-xs mb-2 py-2"
                  />
                  <input 
                    type="email" 
                    placeholder="Email (optional)" 
                    value={newTagEmail} 
                    onChange={(e) => setNewTagEmail(e.target.value)}
                    className="form-control text-xs mb-2 py-2"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button type="submit" className="btn btn-primary btn-xs">Tag</button>
                    <button type="button" className="btn btn-secondary btn-xs" onClick={() => setShowTagInput(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          {/* AI Tags Strip */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
            {media.tags && media.tags.map((tag, i) => (
              <span key={i} className="bg-black/70 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/70">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Social Sidebar */}
        <div className="flex flex-col bg-bg-secondary border-t lg:border-t-0 lg:border-l border-border-color p-6 h-full overflow-hidden">
          {/* Uploader Info */}
          <div className="flex items-center gap-3 mb-5 border-b border-border-color pb-4">
            <div className="w-9 h-9 rounded-full bg-bg-tertiary border border-border-color flex items-center justify-center text-text-muted">
              <UserIcon size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary leading-tight">{media.uploadedBy?.name || 'Photographer'}</h4>
              <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">{media.uploadedBy?.role || 'User'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-5">
            <button 
              className={`${actionBtnBase} ${liked ? 'bg-error-muted border-error/20 text-error' : 'bg-transparent border-border-color text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'}`} 
              onClick={handleLike}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span>{media.likes?.length || 0}</span>
            </button>

            <button 
              className={`${actionBtnBase} ${favourited ? 'bg-warning-muted border-warning/20 text-warning' : 'bg-transparent border-border-color text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'}`} 
              onClick={handleFavourite}
            >
              <Star size={16} fill={favourited ? 'currentColor' : 'none'} />
              <span>Fav</span>
            </button>
            
            <button 
              className={`${actionBtnBase} bg-primary-muted border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary`}
              onClick={handleDownload}
            >
              <Download size={16} />
              <span>Get</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="flex flex-col flex-1 min-h-0">
            <h5 className="text-[13px] font-bold text-text-primary mb-3">Comments ({media.comments?.length || 0})</h5>
            
            <div className="flex-grow overflow-y-auto mb-4 pr-1 flex flex-col gap-2">
              {media.comments && media.comments.length > 0 ? (
                media.comments.map((comment, i) => (
                  <div key={i} className="bg-bg-tertiary/50 border border-border-color p-3 rounded-md">
                    <span className="text-xs font-bold text-text-primary block mb-1">{comment.name}</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{comment.text}</p>
                    <span className="text-[10px] text-text-muted block mt-1.5 text-right font-medium">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-text-muted text-xs my-auto py-8">No comments yet.</div>
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleComment} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)}
                className="form-control pr-11 text-sm"
              />
              <button 
                type="submit" 
                className="absolute right-3 bg-transparent border-none text-primary cursor-pointer hover:text-primary-hover transition-all duration-200 disabled:text-text-muted disabled:cursor-not-allowed"
                disabled={!commentText.trim()}
              >
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
