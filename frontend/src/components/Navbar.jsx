import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User as UserIcon, Heart, Image as ImageIcon, LayoutDashboard, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Navbar = ({ onPreviewMedia }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const navLinkBase = "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200";
  const navLinkInactive = `${navLinkBase} text-text-secondary hover:text-text-primary hover:bg-white/[0.04]`;
  const navLinkActive = `${navLinkBase} text-white bg-primary/12 border border-primary/20`;

  return (
    <nav className="flex flex-col md:flex-row justify-between items-center px-6 py-3 bg-bg-secondary border-b border-border-color z-50">
      {/* Logo */}
      <div className="flex items-center">
        <Link to="/dashboard" className="flex items-center gap-2.5 font-extrabold text-lg">
          <div className="w-8 h-8 rounded-md bg-primary/12 border border-primary/20 flex items-center justify-center text-primary">
            <Camera size={18} />
          </div>
          <span className="gradient-text tracking-tight">EventMediaHub</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-1">
        <Link 
          to="/dashboard" 
          className={isActive('/dashboard') ? navLinkActive : navLinkInactive}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </Link>

        {user.role === 'Club Member' && (
          <Link 
            to="/matched" 
            className={isActive('/matched') ? navLinkActive : navLinkInactive}
          >
            <ImageIcon size={16} />
            <span>My Photos</span>
          </Link>
        )}

        <Link 
          to="/favourites" 
          className={isActive('/favourites') ? navLinkActive : navLinkInactive}
        >
          <Heart size={16} />
          <span>Favourites</span>
        </Link>
      </div>

      {/* Right Side — Notifications, Profile, Logout */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-around md:justify-end">
        {/* Notification Bell */}
        <div ref={notificationRef} className="relative">
          <button 
            className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-text-secondary border border-border-color bg-transparent hover:bg-white/[0.04] hover:text-text-primary hover:border-border-hover transition-all duration-200" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-bg-secondary">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-[48px] right-0 w-[320px] max-h-[400px] bg-bg-secondary border border-border-color rounded-md z-[100] overflow-hidden shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center px-4 py-3 border-b border-border-color">
                <h5 className="text-sm font-bold text-text-primary">Notifications</h5>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="bg-transparent border-none text-primary text-xs font-semibold cursor-pointer hover:underline transition-all duration-200">
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif._id} 
                      className={`px-4 py-3 border-b border-border-color cursor-pointer hover:bg-white/[0.02] transition-all duration-200 ${!notif.isRead ? 'bg-primary-muted border-l-[3px] border-l-primary' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <p className="text-[13px] text-text-primary leading-normal mb-1">{notif.message}</p>
                      <span className="text-[11px] text-text-muted">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-text-muted text-xs">No notifications yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer py-1.5 px-3 rounded-full border border-border-color hover:bg-white/[0.04] hover:border-border-hover transition-all duration-200">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover border-[1.5px] border-primary" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-text-muted border border-border-color">
              <UserIcon size={14} />
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-text-primary leading-tight">{user.name}</span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{user.role}</span>
          </div>
        </Link>

        {/* Logout */}
        <button 
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-text-secondary border border-border-color bg-transparent hover:bg-error-muted hover:border-error/20 hover:text-error transition-all duration-200" 
          onClick={handleLogout} 
          title="Log Out"
          aria-label="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
