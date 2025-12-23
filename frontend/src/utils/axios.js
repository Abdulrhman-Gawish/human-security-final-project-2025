import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://localhost:4000/api',
  withCredentials: true, 
});

instance.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default instance;
