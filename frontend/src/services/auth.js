import axios from 'axios';

const http = axios.create({ baseURL: '/api/auth' });

const TOKEN_KEY = 'wt_token';
const EMAIL_KEY = 'wt_email';

export function getToken()   { return localStorage.getItem(TOKEN_KEY); }
export function getEmail()   { return localStorage.getItem(EMAIL_KEY); }
export function isLoggedIn() { return !!getToken(); }

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

async function storeAndReturn(promise) {
  const { data } = await promise;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(EMAIL_KEY, data.email);
  return data;
}

export const login    = (email, password) => storeAndReturn(http.post('/login',    { email, password }));
export const register = (email, password) => storeAndReturn(http.post('/register', { email, password }));
