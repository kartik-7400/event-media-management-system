import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EventDetails from './pages/EventDetails';
import Favourites from './pages/Favourites';
import MatchedPhotos from './pages/MatchedPhotos';
import Profile from './pages/Profile';

// Components
import Navbar from './components/Navbar';
import Lightbox from './components/Lightbox';

const themes = {
  indigo: { primary: '#6366f1', primaryHover: '#4f46e5', accent: '#d946ef', accentHover: '#c026d3' },
  emerald: { primary: '#10b981', primaryHover: '#059669', accent: '#3b82f6', accentHover: '#2563eb' },
  crimson: { primary: '#f43f5e', primaryHover: '#e11d48', accent: '#f59e0b', accentHover: '#d97706' }
};

// Route protector wrapper
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="text-center py-20 text-text-secondary animate-pulse">Checking credentials...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { user } = useAuth();
  const [globalMediaId, setGlobalMediaId] = useState(null);

  // Initialize theme on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'indigo';
    const selected = themes[savedTheme] || themes.indigo;
    document.documentElement.style.setProperty('--color-primary-val', selected.primary);
    document.documentElement.style.setProperty('--color-primary-hover-val', selected.primaryHover);
    document.documentElement.style.setProperty('--color-accent-val', selected.accent);
    document.documentElement.style.setProperty('--color-accent-hover-val', selected.accentHover);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {user && <Navbar onPreviewMedia={(id) => setGlobalMediaId(id)} />}
      
      <main className="flex-1">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/event/:id" element={
            <PrivateRoute>
              <EventDetails />
            </PrivateRoute>
          } />
          
          <Route path="/favourites" element={
            <PrivateRoute>
              <Favourites />
            </PrivateRoute>
          } />
          
          <Route path="/matched" element={
            <PrivateRoute>
              <MatchedPhotos />
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Global media preview Lightbox */}
      {globalMediaId && (
        <Lightbox 
          mediaId={globalMediaId} 
          onClose={() => setGlobalMediaId(null)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
