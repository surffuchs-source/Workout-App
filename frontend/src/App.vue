<template>
  <div>
    <header v-if="loggedIn">
      <div class="container">
        <span class="brand">Workout Tracker</span>
        <button class="dark-toggle" @click="toggleDark" :title="isDark ? 'Light mode' : 'Dark mode'">
          {{ isDark ? '☀' : '🌙' }}
        </button>

        <!-- desktop nav -->
        <nav class="desktop-nav">
          <RouterLink to="/news">News</RouterLink>
          <RouterLink to="/workouts">Workouts</RouterLink>
          <RouterLink to="/logs">Logs</RouterLink>
          <RouterLink to="/exercises">Exercises</RouterLink>
          <RouterLink to="/calendar">Calendar</RouterLink>
          <RouterLink to="/stats">Stats</RouterLink>
          <RouterLink to="/achievements">Achievements</RouterLink>
        </nav>

        <div class="user-area">
          <div v-if="countdown" class="countdown">
            <span class="countdown-label">Next workout</span>
            <span class="countdown-value">{{ countdown }}</span>
          </div>
          <span class="user-email">{{ email }}</span>
          <button class="btn-logout" @click="handleLogout">Logout</button>
        </div>

        <!-- hamburger button (mobile only) -->
        <button class="hamburger" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      <!-- mobile nav drawer -->
      <nav v-if="menuOpen" class="mobile-nav" @click="menuOpen = false">
        <RouterLink to="/workouts">Workouts</RouterLink>
        <RouterLink to="/logs">Logs</RouterLink>
        <RouterLink to="/exercises">Exercises</RouterLink>
        <RouterLink to="/calendar">Calendar</RouterLink>
        <RouterLink to="/stats">Stats</RouterLink>
        <RouterLink to="/achievements">Achievements</RouterLink>
        <RouterLink to="/news">News</RouterLink>
      </nav>
    </header>
    <main :class="{ container: loggedIn }">
      <RouterView />
    </main>
    <WorkoutBackground v-if="loggedIn" />
    <AchievementToast />
    <LoadingSpinner />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { isLoggedIn, getEmail, logout } from './services/auth.js';
import { workoutLogsApi } from './services/api.js';
import { isDark, initDark, toggleDark } from './services/useDark.js';
import { playClickSound } from './services/useClickSound.js';
import AchievementToast   from './components/AchievementToast.vue';
import LoadingSpinner     from './components/LoadingSpinner.vue';
import WorkoutBackground  from './components/WorkoutBackground.vue';

const router   = useRouter();
const loggedIn = computed(isLoggedIn);
const email    = computed(getEmail);
const menuOpen = ref(false);

onMounted(() => {
  initDark();
  window.addEventListener('click', playClickSound);
});

const countdown = ref('');
let timer           = null;
let nextWorkoutTime = null;

function logDateTime(log) {
  const d = new Date(log.date);
  const [h, m] = log.startTime.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Starting now!';
  const totalSec = Math.floor(ms / 1000);
  const d   = Math.floor(totalSec / 86400);
  const h   = Math.floor((totalSec % 86400) / 3600);
  const m   = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const parts = [];
  if (d)           parts.push(`${d}d`);
  if (h)           parts.push(`${h}h`);
  if (m || d || h) parts.push(`${m}m`);
  parts.push(`${String(sec).padStart(2, '0')}s`);
  return parts.join(' ');
}

function tick() {
  if (!nextWorkoutTime) { countdown.value = ''; return; }
  const diff = nextWorkoutTime - Date.now();
  if (diff < -60_000) { fetchNext(); return; }
  countdown.value = formatCountdown(Math.max(0, diff));
}

async function fetchNext() {
  try {
    const { data } = await workoutLogsApi.list();
    const now = Date.now();
    const upcoming = data
      .filter(l => !l.done && l.startTime)
      .map(l => logDateTime(l).getTime())
      .filter(t => t > now)
      .sort((a, b) => a - b);
    nextWorkoutTime = upcoming[0] ?? null;
    tick();
  } catch {
    nextWorkoutTime = null;
    countdown.value = '';
  }
}

function startTimer() {
  fetchNext();
  timer = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
  nextWorkoutTime = null;
  countdown.value = '';
}

watch(loggedIn, val => val ? startTimer() : stopTimer(), { immediate: true });
onUnmounted(() => {
  stopTimer();
  window.removeEventListener('click', playClickSound);
});

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

<style>
:root {
  --bg:           #f8fafc;
  --surface:      #ffffff;
  --surface-alt:  #f8fafc;
  --text:         #1e293b;
  --text-2:       #475569;
  --text-3:       #64748b;
  --text-muted:   #94a3b8;
  --border:       #e2e8f0;
  --border-light: #f1f5f9;
  --pill-bg:      #e8ffb0;
  --pill-text:    #3a6e00;
  --pill-hover:   #d0ff8a;
  --input-bg:     #ffffff;
}

html.dark {
  --bg:           #0f172a;
  --surface:      #1e293b;
  --surface-alt:  #263347;
  --text:         #f1f5f9;
  --text-2:       #94a3b8;
  --text-3:       #64748b;
  --text-muted:   #475569;
  --border:       #334155;
  --border-light: #1e293b;
  --pill-bg:      #14290a;
  --pill-text:    #a3e635;
  --pill-hover:   #1a3a0d;
  --input-bg:     #1e293b;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.container { max-width: 900px; margin: 0 auto; padding: 0 1.25rem; }

header { background: #7ffc03; color: #111827; padding: 0.875rem 0; position: relative; z-index: 2; }
header .container { display: flex; align-items: center; justify-content: center; gap: 2rem; }
.brand { font-size: 1.125rem; font-weight: 700; flex-shrink: 0; color: #111827; }
nav { display: flex; gap: 1.5rem; flex: 1; justify-content: center; }
nav a { color: rgba(0,0,0,0.55); text-decoration: none; font-weight: 500; transition: color 0.15s; }
nav a:hover, nav a.router-link-active { color: #111827; }

.user-area { display: flex; align-items: center; gap: 0.875rem; flex-shrink: 0; }
.user-email { font-size: 0.8125rem; color: rgba(0,0,0,0.55); }

.countdown {
  display: flex; flex-direction: column; align-items: flex-end;
  background: rgba(0,0,0,0.1); border-radius: 8px;
  padding: 0.25rem 0.75rem; line-height: 1.3;
}
.countdown-label { font-size: 0.625rem; font-weight: 600; color: rgba(0,0,0,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
.countdown-value { font-size: 0.875rem; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
.btn-logout {
  background: rgba(0,0,0,0.1); color: #111827;
  border: 1px solid rgba(0,0,0,0.2);
  border-radius: 6px; font-size: 0.8125rem;
  padding: 0.3rem 0.75rem; cursor: pointer; transition: background 0.15s;
}
.btn-logout:hover { background: rgba(0,0,0,0.18); }

main.container { padding: 2rem 1.25rem; position: relative; z-index: 1; }

/* ── Hamburger / mobile nav ────────────────────────────────────── */
.hamburger {
  display: none;
  flex-direction: column; justify-content: center; gap: 5px;
  background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.15);
  border-radius: 6px; padding: 0.45rem 0.55rem;
  width: 2.25rem; height: 2.25rem; flex-shrink: 0; margin-left: auto;
}
.hamburger span {
  display: block; height: 2px; background: #111827;
  border-radius: 2px; transition: transform 0.2s, opacity 0.2s;
}
.hamburger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.hamburger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

.mobile-nav {
  display: flex; flex-direction: column;
  background: #7ffc03; padding: 0.5rem 1.25rem 1rem;
  border-top: 1px solid rgba(0,0,0,0.1);
}
.mobile-nav a {
  color: rgba(0,0,0,0.6); text-decoration: none;
  font-weight: 600; font-size: 1rem;
  padding: 0.75rem 0; border-bottom: 1px solid rgba(0,0,0,0.08);
}
.mobile-nav a:last-child { border-bottom: none; }
.mobile-nav a.router-link-active, .mobile-nav a:hover { color: #111827; }

@media (max-width: 680px) {
  .desktop-nav { display: none; }
  .user-area    { display: none; }
  .hamburger    { display: flex; }
  header .container { gap: 0.75rem; }
}

button {
  cursor: pointer; font-family: inherit; font-size: 0.875rem;
  border: none; border-radius: 6px; padding: 0.5rem 1rem; transition: opacity 0.15s;
}
button:hover:not(:disabled) { opacity: 0.85; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary   { background: #7ffc03; color: #111827; }
.btn-success   { background: #10b981; color: white; }
.btn-danger    { background: #ef4444; color: white; }
.btn-secondary { background: #e2e8f0; color: #1e293b; }
.btn-sm        { font-size: 0.75rem; padding: 0.325rem 0.625rem; }

.dark-toggle {
  background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.15);
  border-radius: 6px; padding: 0.3rem 0.5rem;
  font-size: 1rem; cursor: pointer; line-height: 1; flex-shrink: 0;
  color: #111827;
}

input, select, textarea {
  font-family: inherit; font-size: 0.875rem;
  border: 1px solid var(--border); border-radius: 6px;
  padding: 0.5rem 0.75rem; width: 100%; outline: none;
  background: var(--input-bg); color: var(--text);
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus { border-color: #7ffc03; }

label { font-size: 0.8125rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.25rem; display: block; }
.form-group { margin-bottom: 1rem; }
.error { color: #ef4444; font-size: 0.8125rem; margin-top: 0.5rem; }
</style>
