import React, { useState, useEffect } from 'react';
import { Star, Image as ImageIcon, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
      const res = await fetch('/api/media/favourites/list', {
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
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
        <div className="w-10 h-10 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center text-warning">
          <Star size={22} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-text-primary">My Favourites</h1>
          <p className="text-sm text-text-secondary">Your personal collection of saved photos and videos</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse">Loading favourites...</div>
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
                className="group relative aspect-[4/3] rounded-md overflow-hidden bg-black border border-white/5 cursor-pointer shadow-lg hover:border-primary/40 hover:scale-[1.02] hover:shadow-primary/5 transition-all duration-300"
                onClick={() => setActiveMediaId(media._id)}
              >
                {isVideo ? (
                  <video src={media.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={media.url} alt="favourite-media" className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-4 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-text-secondary font-bold truncate max-w-[150px]">
                      {media.event?.title}
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
          <ImageIcon size={48} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-secondary text-sm">You haven't added any media to your favourites yet.</p>
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
