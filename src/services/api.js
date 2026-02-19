import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cc-crm-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const signup = (data) => api.post('/auth/signup', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Booking APIs
export const createBooking = (data) => api.post('/bookings', data);
export const getOldBookings = (params) => api.get('/bookings/old', { params });
export const getBookingById = (id) => api.get(`/bookings/${id}`);

// Analytics APIs
export const getAdPerformance = (params) => api.get('/analytics/ad-performance', { params });

// Daily Reports API
export const getDailyReports = () => api.get('/bookings/daily-reports');

export default api;
