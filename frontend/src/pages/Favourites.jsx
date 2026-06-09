import React, { useState, useEffect } from 'react';
import { Star, Image as ImageIcon, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Lightbox from '../components/Lightbox';

const Favourites = () => {
  const { token, user } = useAuth();
  const [favMedia, setFavMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMediaId, setActiveMediaId] = useState(null);

  const fetchFavourites = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/media/favourites/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setFavMedia(result.data);
      }
    } catch (error) {
      console.error('Error fetching favourites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, [token]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-border-color pb-4">
        <div className="w-10 h-10 rounded-md bg-warning-muted border border-warning/15 flex items-center justify-center text-warning">
          <Star size={20} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary" style={{ letterSpacing: '-0.02em' }}>My Favourites</h1>
          <p className="text-sm text-text-secondary">Your personal collection of saved photos and videos</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton aspect-[4/3] rounded-md"></div>
          ))}
        </div>
      ) : favMedia.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-up">
          {favMedia.map(media => {
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
                  <img src={media.url} alt="Favourite media" className="w-full h-full object-cover" />
                )}

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-between p-4 transition-opacity duration-300">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-white/70 font-semibold truncate max-w-[150px]">
                      {media.event?.title}
                    </span>
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
                    
                    <span className="text-[10px] text-white/50 truncate max-w-[100px]">
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
          <p className="text-text-secondary text-sm font-medium">You haven't added any media to your favourites yet.</p>
          <p className="text-text-muted text-xs mt-1">Click the star icon on any photo to save it here.</p>
        </div>
      )}

      {activeMediaId && (
        <Lightbox 
          mediaId={activeMediaId} 
          onClose={() => setActiveMediaId(null)}
          onActionSuccess={fetchFavourites}
        />
      )}
    </div>
  );
};

export default Favourites;
