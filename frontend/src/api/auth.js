import axios from 'axios';

const api = axios.create({
  baseURL: '/api/auth',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if present
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
  const response = await axios.post('/api/users/google-auth', userData);
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
  const response = await axios.delete(`/api/admin/users/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const deleteUserAccount = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(`/api/admin/users/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export default api;
