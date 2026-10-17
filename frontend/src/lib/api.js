import axios from 'axios';

const USER_SERVICE_BASE_URL = process.env.NEXT_PUBLIC_USER_API_URL || 'https://clinic-user-service.onrender.com/api';

const API = axios.create({
  baseURL: USER_SERVICE_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${USER_SERVICE_BASE_URL}/users/refresh-token`,
          {},
          { withCredentials: true }
        );
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return API(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const CLINIC_SERVICE_BASE_URL = process.env.NEXT_PUBLIC_CLINIC_API_URL || 'http://localhost:3002/api/clinics';

export const clinicApi = axios.create({
  baseURL: CLINIC_SERVICE_BASE_URL,
  withCredentials: true,
});

clinicApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

clinicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${USER_SERVICE_BASE_URL}/users/refresh-token`,
          {},
          { withCredentials: true }
        );
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return clinicApi(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('Session expired or unauthorized');
      }
    }
    return Promise.reject(error);
  }
);

export { clinicApi as clinicAPI };
export default API;

