import axios, { AxiosResponse, AxiosError } from 'axios';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError<any>) => {
    const errorMsg = error.response?.data?.message || error.message || 'API Request Failed';
    return Promise.reject(new Error(errorMsg));
  }
);
