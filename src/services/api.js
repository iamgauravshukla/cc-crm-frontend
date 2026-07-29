import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://miraculous-serenity-production-5d5a.up.railway.app/api');

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
export const createBooking      = (data)         => api.post('/bookings', data);
export const getOldBookings     = (params)        => api.get('/bookings/old', { params });
export const getBookingById     = (id)            => api.get(`/bookings/${id}`);
export const deleteBooking      = (rowNumber)     => api.delete(`/bookings/${rowNumber}`);
export const bulkUpdateStatus   = (data)          => api.post('/bookings/bulk-status', data);
export const bulkDeleteBookings = (recordIds)     => api.post('/bookings/bulk-delete', { recordIds });
export const getCustomerHistory = (query)         => api.get('/bookings/customer', { params: { query } });
export const exportBookings     = (params)        => api.get('/bookings/export', { params, responseType: 'blob' });
export const getActivityLog     = (bookingId)     => api.get(`/bookings/${bookingId}/activity`);
export const getKanbanBookings  = (params)        => api.get('/bookings/kanban', { params });
export const updateBooking      = (id, data)      => api.put(`/bookings/${id}`, data);
export const updateValidation   = (id, data)      => api.patch(`/bookings/${id}/validation`, data);
export const updateBookingFlags = (id, data)      => api.patch(`/bookings/${id}/flags`, data);
export const importBookings     = (formData)      => api.post('/bookings/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 5 * 60 * 1000, // large files can take a few minutes
});

// Saved Views APIs
export const getSavedViews    = ()           => api.get('/saved-views');
export const createSavedView  = (data)       => api.post('/saved-views', data);
export const deleteSavedView  = (id)         => api.delete(`/saved-views/${id}`);

// Analytics APIs
export const getAdPerformance = (params) => api.get('/analytics/ad-performance', { params });
export const getSalesReport = (params = {}) => api.get('/analytics/sales-report', { params });

// Daily Reports API
export const getDailyReports = (params) => api.get('/bookings/daily-reports', { params });
export const getOTSBookings = (params) => api.get('/bookings/daily-reports/ots', { params });
export const getOverallBookings = (params) => api.get('/bookings/daily-reports/overall', { params });
export const getTomorrowBookings = (params) => api.get('/bookings/daily-reports/tomorrow', { params });
export const getNext7DaysBookings = (params) => api.get('/bookings/daily-reports/next7days', { params });
export const getCancellations = (params) => api.get('/bookings/daily-reports/cancellations', { params });
export const getArrivalsToday = (params) => api.get('/bookings/daily-reports/arrivals-today', { params });
export const getTomorrowSummary = (params) => api.get('/bookings/daily-reports/tomorrow-summary', { params });
export const getCCReport = (params) => api.get('/bookings/cc-report', { params });
export const getCCReportDrilldown = (section, params) => api.get('/bookings/cc-report/drilldown', { params: { section, ...params } });

// Website Leads APIs (GET — protected, for CRM)
export const getCallLeads = (params) => api.get('/leads/call', { params });
export const getBookingLeads = (params) => api.get('/leads/booking', { params });
export const getLeadCenters = () => api.get('/leads/centers');
export const updateLead = (type, rowIndex, data) => api.patch(`/leads/${type}/${rowIndex}`, data);

// Config (dropdown options) APIs
export const getConfig           = ()         => api.get('/config');
export const addConfigOption     = (data)     => api.post('/config', data);
export const updateConfigOption  = (id, data) => api.put(`/config/${id}`, data);
export const deleteConfigOption  = (id)       => api.delete(`/config/${id}`);
export const reorderConfigOptions = (data)    => api.post('/config/reorder', data);

export default api;
