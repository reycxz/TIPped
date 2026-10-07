import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const createDepartment = async (deptData) => {
  const response = await api.post('/departments', deptData);
  return response.data;
};

export const updateDepartment = async (id, deptData) => {
  const response = await api.put(`/departments/${id}`, deptData);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/admin/departments/${id}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const createCategory = async (catData) => {
  const response = await api.post('/categories', catData);
  return response.data;
};

export const updateCategory = async (id, catData) => {
  const response = await api.put(`/categories/${id}`, catData);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
};

export default api;
