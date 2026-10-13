import axios from 'axios';
import { API_BASE_URL, buildApiUrl, buildAxiosConfig } from './config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/tickets`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMetrics = async () => {
  const response = await api.get('/metrics');
  return response.data;
};

export const getMyTickets = async (params = {}) => {
  const response = await api.get('/my-tickets', { params });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const createTicket = async (ticketData) => {
  const isFormData = typeof FormData !== 'undefined' && ticketData instanceof FormData;
  const response = await api.post('/', ticketData, {
    ...buildAxiosConfig(),
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const createGuestTicket = async (ticketData) => {
  const isFormData = typeof FormData !== 'undefined' && ticketData instanceof FormData;
  const response = await api.post('/guest', ticketData, {
    ...buildAxiosConfig(),
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const getAdminTickets = async (params = {}) => {
  const response = await api.get('/admin', { params });
  return response.data;
};

export const getAnalytics = async (params = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    params,
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
  const response = await axios.get(buildApiUrl('/api/reports/analytics'), config);
  return response.data;
};

export const updateTicket = async (id, updateData) => {
  const response = await api.put(`/${id}`, updateData);
  return response.data;
};

export const getArchivedReports = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(buildApiUrl('/api/reports/archived'), {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const archiveReport = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(buildApiUrl(`/api/reports/${id}/archive`), {}, {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const restoreReport = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(buildApiUrl(`/api/reports/${id}/restore`), {}, {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const deleteReportForever = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(buildApiUrl(`/api/reports/${id}`), {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const getArchivedTickets = getArchivedReports;
export const archiveTicket = archiveReport;
export const restoreTicket = restoreReport;
export const deleteTicketForever = deleteReportForever;

export default api;
