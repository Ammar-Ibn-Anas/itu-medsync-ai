import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('medsync_token'));
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('medsync_token', token);
      fetchAdminProfile();
    } else {
      localStorage.removeItem('medsync_token');
      setAdmin(null);
      setLoading(false);
    }
  }, [token]);

  const fetchAdminProfile = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setAdmin(res.data);
    } catch (err) {
      console.error('Failed to fetch admin profile', err);
      // Let the interceptor handle the 401 redirect if needed
      if (err.response?.status === 401) {
        setAdmin(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    setToken(res.data.access_token);
    setAdmin(res.data.user);
    return res.data;
  };

  const setup = async (name, email, password) => {
    const res = await api.post('/api/auth/setup', { name, email, password });
    setToken(res.data.access_token);
    setAdmin(res.data.user);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    window.location.href = '/admin/login';
  };

  return (
    <AuthContext.Provider value={{
      token,
      admin,
      loading,
      isAuthenticated: !!token,
      login,
      setup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
