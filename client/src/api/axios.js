import axios from "axios";

let rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
rawBase = rawBase.replace(/\/+$/, '');
if (!rawBase.endsWith('/api') && !rawBase.includes('/api/')) {
  rawBase = `${rawBase}/api`;
}
const API_BASE_URL = rawBase;

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

// Request interceptor — add token to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — refresh token on 401 or 403 authorization errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError =
      error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.error === "No authorization");

    if (isAuthError && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshUrl = `${API_BASE_URL}/user/refresh`;
        const response = await axios.post(refreshUrl, {}, { withCredentials: true });
        const newToken = response.data?.["New access token"] || response.data?.accessToken;

        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
