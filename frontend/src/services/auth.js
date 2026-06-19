import axios from 'axios';
import { ref } from 'vue';

const TOKEN_KEY = 'wt_token';
const EMAIL_KEY = 'wt_email';

const _token = ref(localStorage.getItem(TOKEN_KEY));
const _email = ref(localStorage.getItem(EMAIL_KEY));

export function getToken()   { return _token.value; }
export function getEmail()   { return _email.value; }
export function isLoggedIn() { return !!_token.value; }

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  _token.value = null;
  _email.value = null;
}

async function storeAndReturn(promise) {
  const { data } = await promise;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(EMAIL_KEY, data.email);
  _token.value = data.token;
  _email.value = data.email;
  return data;
}

const http = axios.create({ baseURL: '/api/auth' });

export const login    = (email, password) => storeAndReturn(http.post('/login',    { email, password }));
export const register = (email, password) => storeAndReturn(http.post('/register', { email, password }));
