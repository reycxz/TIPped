import axios from 'axios';
import { API_BASE_URL, buildApiUrl, buildAxiosConfig } from './config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
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

export const loginUser = async (email, password) => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

export const googleAuthApi = async (userData) => {
  const response = await axios.post(buildApiUrl('/api/auth/google-auth'), userData, buildAxiosConfig());
  return response.data;
};

export const acceptPrivacyConsent = async (consentToken) => {
  const response = await axios.post(buildApiUrl('/api/auth/consent'), { consentToken }, buildAxiosConfig());
  return response.data;
};

export const declinePrivacyConsent = async (consentToken) => {
  const response = await axios.post(buildApiUrl('/api/auth/decline'), { consentToken }, buildAxiosConfig());
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/register', userData);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await api.post('/reset-password', { email, otp, newPassword });
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put('/profile', profileData);
  return response.data;
};

export const updateUserProfile = updateProfile;

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/change-password', { currentPassword, newPassword });
  return response.data;
};

export const verifyRegistrationOtp = async (email, otp) => {
  const response = await api.post('/verify-otp', { email, otp });
  return response.data;
};

export const resendRegistrationOtp = async (email) => {
  const response = await api.post('/resend-otp', { email });
  return response.data;
};

export const getDepartmentAccounts = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const createDepartmentAccount = async (accountData) => {
  const response = await api.post('/departments', accountData);
  return response.data;
};

export const updateDepartmentAccount = async (id, accountData) => {
  const response = await api.put(`/departments/${id}`, accountData);
  return response.data;
};

export const deleteDepartmentAccount = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(buildApiUrl(`/api/admin/users/${id}`), {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const deleteUserAccount = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(buildApiUrl(`/api/admin/users/${id}`), {
    ...buildAxiosConfig(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export default api;
