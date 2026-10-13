import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'https://tipped-backend.onrender.com').replace(/\/$/, '');

export const buildApiUrl = (path = '/') => {
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildAxiosConfig = (extraConfig = {}) => ({
  withCredentials: true,
  ...extraConfig,
});

export const getErrorMessage = (err, fallback = 'An error occurred') =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
