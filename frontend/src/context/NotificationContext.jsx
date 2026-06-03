import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [activeToast, setActiveToast] = useState(null);

  // Fetch notifications list
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Connect WebSockets when authenticated
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect socket relative to current origin (Vite will proxy /socket.io to backend)
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected to notification server');
      newSocket.emit('join', user._id);
    });

    // Listen for incoming real-time notifications
    newSocket.on('notification', (notification) => {
      console.log('🔔 Received real-time notification:', notification);
      
      // Add to list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Display toast alert
      setActiveToast(notification);

      // Clear toast after 5 seconds
      setTimeout(() => {
        setActiveToast(prev => (prev?._id === notification._id ? null : prev));
      }, 5000);
    });

    fetchNotifications();

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const markAsRead = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      activeToast, 
      markAsRead, 
      markAllAsRead, 
      fetchNotifications,
      closeToast: () => setActiveToast(null)
    }}>
      {children}
      
      {/* Real-time In-App Notification Toast */}
      {activeToast && (
        <div style={toastStyles.container} className="fade-in-up">
          <div style={toastStyles.header}>
            <span style={toastStyles.bell}>🔔</span>
            <span style={toastStyles.title}>Notification</span>
            <button style={toastStyles.closeBtn} onClick={() => setActiveToast(null)}>×</button>
          </div>
          <div style={toastStyles.body}>{activeToast.message}</div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

const toastStyles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#1b1b2f',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    width: '320px',
    zIndex: 9999,
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  bell: {
    marginRight: '8px',
  },
  title: {
    fontWeight: 'bold',
    color: '#f8fafc',
    flexGrow: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  body: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.4',
  }
};

export const useNotifications = () => useContext(NotificationContext);
