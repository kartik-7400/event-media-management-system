import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User as UserIcon, Heart, Image as ImageIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Navbar = ({ onPreviewMedia }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const handleNotificationClick = (notif) => {
    markAsRead(notif._id);
    setShowNotifications(false);
    
    if (notif.media) {
      if (onPreviewMedia) {
        onPreviewMedia(notif.media._id || notif.media);
      } else {
        navigate(`/dashboard`);
      }
    } else if (notif.event) {
      navigate(`/event/${notif.event._id || notif.event}`);
    }
  };

  if (!user) return null;

  return (
    <nav className="flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-bg-secondary/85 border border-white/6 rounded-md m-4 md:m-6 backdrop-blur-md gap-4 z-50">
      <div className="flex items-center">
        <Link to="/dashboard" className="flex items-center gap-2.5 font-extrabold text-xl">
          <span className="text-2xl drop-shadow-[0_0_8px_var(--color-primary)]">📸</span>
          <span className="gradient-text font-heading tracking-tight">EventMediaHub</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link 
          to="/dashboard" 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-text-secondary text-sm font-semibold hover:text-text-primary hover:bg-white/3 transition-all duration-200 ${isActive('/dashboard') ? 'text-white bg-primary/15 border border-primary/25' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        {user.role === 'Club Member' && (
          <Link 
            to="/matched" 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-text-secondary text-sm font-semibold hover:text-text-primary hover:bg-white/3 transition-all duration-200 ${isActive('/matched') ? 'text-white bg-primary/15 border border-primary/25' : ''}`}
          >
            <ImageIcon size={18} />
            <span>My Photos</span>
          </Link>
        )}

        <Link 
          to="/favourites" 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-text-secondary text-sm font-semibold hover:text-text-primary hover:bg-white/3 transition-all duration-200 ${isActive('/favourites') ? 'text-white bg-primary/15 border border-primary/25' : ''}`}
        >
          <Heart size={18} />
          <span>Favourites</span>
        </Link>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto justify-around md:justify-end">
        {/* Real-time Notifications Bell */}
        <div className="relative">
          <button 
            className={`relative bg-white/3 border border-white/6 text-text-secondary w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/8 hover:text-text-primary hover:-translate-y-0.5 transition-all duration-200 ${unreadCount > 0 ? 'animate-bounce' : ''}`} 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-bg-secondary shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-[50px] right-0 w-[320px] max-h-[400px] bg-bg-secondary border border-white/8 rounded-md z-100 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                <h5 className="text-sm font-bold text-text-primary">Notifications</h5>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="bg-transparent border-none color-primary text-xs font-semibold cursor-pointer hover:text-accent hover:underline transition-all duration-200">
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif._id} 
                      className={`p-3 border-b border-white/3 cursor-pointer hover:bg-white/3 transition-all duration-200 ${!notif.isRead ? 'bg-primary/5 border-l-[3px] border-primary' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <p className="text-[12px] text-text-primary leading-normal mb-1">{notif.message}</p>
                      <span className="text-[10px] text-text-muted">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-text-muted text-xs">No notifications.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Summary */}
        <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer p-1.5 px-3 rounded-full bg-white/2 border border-white/4 hover:bg-white/5 hover:border-white/8 transition-all duration-200">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="selfie" className="w-7 h-7 rounded-full object-cover border-[1.5px] border-primary" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary border border-white/10">
              <UserIcon size={14} />
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-text-primary">{user.name}</span>
            <span className="text-[9px] text-primary font-bold uppercase tracking-wider">{user.role}</span>
          </div>
        </Link>

        {/* Logout Button */}
        <button 
          className="relative bg-white/3 border border-white/6 text-text-secondary w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:-translate-y-0.5 hover:bg-error/10 hover:border-error/20 hover:text-error transition-all duration-200" 
          onClick={handleLogout} 
          title="Log Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
