import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Route protector wrapper
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-text-muted font-medium">Checking credentials...</span>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { user } = useAuth();
  const [globalMediaId, setGlobalMediaId] = useState(null);

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
