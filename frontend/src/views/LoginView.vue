<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="brand">Workout Tracker</h1>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }"    @click="switchMode('login')">Login</button>
        <button :class="{ active: mode === 'register' }" @click="switchMode('register')">Register</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="you@example.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required placeholder="••••••••" autocomplete="current-password" />
        </div>
        <div v-if="mode === 'register'" class="form-group">
          <label>Confirm Password</label>
          <input v-model="confirm" type="password" required placeholder="••••••••" autocomplete="new-password" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login, register } from '../services/auth.js';

const router   = useRouter();
const mode     = ref('login');
const email    = ref('');
const password = ref('');
const confirm  = ref('');
const error    = ref('');
const loading  = ref(false);

function switchMode(m) {
  mode.value     = m;
  error.value    = '';
  password.value = '';
  confirm.value  = '';
}

async function handleSubmit() {
  error.value = '';
  if (mode.value === 'register' && password.value !== confirm.value) {
    error.value = 'Passwords do not match';
    return;
  }
  loading.value = true;
  try {
    mode.value === 'login'
      ? await login(email.value, password.value)
      : await register(email.value, password.value);
    router.push('/workouts');
  } catch (e) {
    error.value = e.response?.data?.error ?? 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 1rem;
}
.auth-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07);
}
.brand {
  text-align: center;
  font-size: 1.375rem;
  font-weight: 800;
  color: #7ffc03;
  margin-bottom: 1.75rem;
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.75rem;
}
.tabs button {
  padding: 0.625rem;
  background: transparent;
  border: none;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-3);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tabs button.active {
  background: #7ffc03;
  color: white;
}
.btn-submit {
  width: 100%;
  padding: 0.75rem;
  background: #7ffc03;
  color: #111827;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.15s;
}
.btn-submit:hover:not(:disabled) { opacity: 0.88; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
