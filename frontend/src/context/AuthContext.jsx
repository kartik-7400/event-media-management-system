import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (result.success) {
          setUser(result.data);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('token', result.data.token);
        setToken(result.data.token);
        setUser(result.data);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async ({ name, email, password, role, clubName }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, clubName })
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('token', result.data.token);
        setToken(result.data.token);
        setUser(result.data);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const uploadSelfie = async (file) => {
    if (!token) return { success: false, message: 'Not authenticated' };

    try {
      // 1. Get presigned URL from backend
      const response = await fetch(`${API_BASE_URL}/api/auth/selfie-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contentType: file.type })
      });
      const result = await response.json();
      
      if (!result.success) {
        return { success: false, message: result.message };
      }

      const { url, key, isMock, fields } = result.data;

      // 2. Upload file to S3 (or mock upload)
      if (isMock) {
        // Mock PUT request with raw binary body
        const uploadResponse = await fetch(`${url}?key=${key}`, {
          method: 'PUT',
          body: file
        });
        if (!uploadResponse.ok) {
          throw new Error('Local mock file upload failed');
        }
      } else {
        // Real S3 PUT request
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });
        if (!uploadResponse.ok) {
          throw new Error('S3 file upload failed');
        }
      }

      // 3. Confirm upload with backend (triggers Rekognition Face Indexing)
      const confirmResponse = await fetch(`${API_BASE_URL}/api/auth/confirm-selfie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key })
      });
      const confirmResult = await confirmResponse.json();

      if (confirmResult.success) {
        setUser(confirmResult.data);
        return { success: true, data: confirmResult.data };
      } else {
        return { success: false, message: confirmResult.message };
      }

    } catch (error) {
      console.error('Selfie upload error:', error);
      return { success: false, message: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, uploadSelfie }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
