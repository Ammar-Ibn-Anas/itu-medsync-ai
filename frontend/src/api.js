import axios from 'axios';

const api = axios.create({
  baseURL: 'https://medsync-backend-xr5w.onrender.com/',
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medsync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
