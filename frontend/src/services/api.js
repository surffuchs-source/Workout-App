import axios from 'axios';
import { getToken } from './auth.js';
import { startLoading, stopLoading } from './useLoading.js';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  startLoading();
  return config;
});

http.interceptors.response.use(
  (response) => { stopLoading(); return response; },
  (error)    => { stopLoading(); return Promise.reject(error); }
);

export const exercisesApi = {
  list:   ()         => http.get('/exercises'),
  get:    (id)       => http.get(`/exercises/${id}`),
  create: (data)     => http.post('/exercises', data),
  update: (id, data) => http.put(`/exercises/${id}`, data),
  remove: (id)       => http.delete(`/exercises/${id}`),
};

export const workoutsApi = {
  list:   ()         => http.get('/workouts'),
  get:    (id)       => http.get(`/workouts/${id}`),
  create: (data)     => http.post('/workouts', data),
  update: (id, data) => http.put(`/workouts/${id}`, data),
  remove: (id)       => http.delete(`/workouts/${id}`),
};

export const workoutLogsApi = {
  list:   ()         => http.get('/workout-logs'),
  get:    (id)       => http.get(`/workout-logs/${id}`),
  create: (data)     => http.post('/workout-logs', data),
  update: (id, data) => http.put(`/workout-logs/${id}`, data),
  remove: (id)       => http.delete(`/workout-logs/${id}`),
};

export const achievementsApi = {
  list:  () => http.get('/achievements'),
  check: () => http.post('/achievements/check'),
};

export const newsApi = {
  list: () => http.get('/news'),
};

export const preferencesApi = {
  get:    ()     => http.get('/preferences'),
  update: (data) => http.put('/preferences', data),
};
