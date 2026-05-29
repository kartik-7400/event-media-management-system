import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Lightbox from '../components/Lightbox';

const MatchedPhotos = () => {
  const { token, user } = useAuth();
  const [matchedMedia, setMatchedMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMediaId, setActiveMediaId] = useState(null);

  const fetchMatchedMedia = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/media/matched', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setMatchedMedia(result.data);
      }
    } catch (error) {
      console.error('Error fetching matched photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchedMedia();
  }, [token]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Banner */}
      <div className="glass-card mb-8 p-8 relative overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-secondary/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-text-primary">Matched Photos</h1>
            <p className="text-sm text-text-secondary">AI Facial Recognition matches of you across all events</p>
          </div>
        </div>
      </div>

      {!user.profilePicture && (
        <div className="mb-6 p-4 rounded bg-warning/10 border border-warning/20 text-warning text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>You haven't uploaded a profile selfie yet. Go to your <a href="/profile" className="underline font-bold">Profile</a> to register your face and begin matching!</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse">Scanning database for face matches...</div>
      ) : matchedMedia.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-up">
          {matchedMedia.map(media => {
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
                  <img src={media.url} alt="matched-media" className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-4 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-text-secondary font-bold truncate max-w-[150px]">
                      {media.event?.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-accent/20 border border-accent/40 text-accent rounded">
                      Matched
                    </span>
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
        <div className="text-center py-24 glass-card">
          <Sparkles size={48} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-secondary text-sm">No photos found containing your face. Ensure you RSVP'd to events!</p>
        </div>
      )}

      {activeMediaId && (
        <Lightbox 
          mediaId={activeMediaId} 
          onClose={() => setActiveMediaId(null)}
          onActionSuccess={fetchMatchedMedia}
        />
      )}
    </div>
  );
};

export default MatchedPhotos;
