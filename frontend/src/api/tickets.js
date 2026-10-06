import axios from 'axios';

const api = axios.create({
  baseURL: '/api/tickets',
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

export const getMyTickets = async () => {
  const response = await api.get('/my-tickets');
  return response.data;
};

export const createTicket = async (ticketData) => {
  const response = await api.post('/', ticketData);
  return response.data;
};

export const getAdminTickets = async (params = {}) => {
  const response = await api.get('/admin', { params });
  return response.data;
};

export const updateTicket = async (id, updateData) => {
  const response = await api.put(`/${id}`, updateData);
  return response.data;
};

export default api;
