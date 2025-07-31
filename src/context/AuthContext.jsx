import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../api/client';

const AuthContext = createContext();

function readJSON(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => readJSON('user'));
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Fix: Add token as dependency to re-run when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthReady(true);
      return;
    }

    // Only fetch user if we don't already have user data
    if (!user) {
      api.get('/api/me')
        .then(res => setUser(res.data))
        .catch(() => clearSession())
        .finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  }, [token]); // ← Add token as dependency

  const saveSession = ({ token, user }) => {
    if (!token || !user) return console.warn('Invalid session data');
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const clearSession = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const login = async (payload) => {
    try {
      const res = await api.post('/api/login', payload);
      
      // Debug everything about the response
      console.log('[DEBUG] Full response object:', res);
      console.log('[DEBUG] Response status:', res.status);
      console.log('[DEBUG] Response headers:', res.headers);
      console.log('[DEBUG] Response data:', res.data);
      console.log('[DEBUG] Type of res.data:', typeof res.data);
      
      // Check if data is a string that needs parsing
      let responseData;
      if (typeof res.data === 'string') {
        try {
          responseData = JSON.parse(res.data);
          console.log('[DEBUG] Parsed data:', responseData);
        } catch (e) {
          console.error('[DEBUG] Failed to parse response data:', e);
          throw new Error('Invalid JSON response');
        }
      } else {
        responseData = res.data;
      }
      
      console.log('[DEBUG] Final token:', responseData.token);
      console.log('[DEBUG] Final user:', responseData.user);

      if (!responseData.token || !responseData.user) {
        console.error('[DEBUG] Missing token or user in response:', responseData);
        throw new Error('Invalid response: missing token or user');
      }

      saveSession(responseData);
      return responseData.user;
    } catch (error) {
      console.error('[DEBUG] Login error:', error);
      throw error;
    }
  };

  const register = async (payload) => {
    const res = await api.post('/api/register', payload);
    saveSession(res.data);
    return res.data.user;
  };

  const logout = async () => {
    try { await api.post('/api/logout'); } catch {}
    clearSession();
  };

  return (
    <AuthContext.Provider value={{
      user, token, authReady,
      isAuthenticated: !!token && !!user,
      login, register, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}