<template>
  <div>
    <div class="view-header">
      <h1>Workout Logs</h1>
      <div class="header-right">
        <div class="filter-tabs">
          <button
            v-for="opt in filterOptions" :key="opt.value"
            class="filter-tab"
            :class="{ active: filter === opt.value }"
            @click="filter = opt.value"
          >{{ opt.label }}</button>
        </div>
        <button class="btn-primary" @click="router.push('/logs/new')">+ New Log</button>
      </div>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && logs.length === 0" class="empty">Loading...</div>
    <div v-else-if="filteredLogs.length === 0 && !loading" class="empty">
      No logs found.
    </div>

    <div v-else class="list">
      <div v-for="log in filteredLogs" :key="log._id" class="log-card">
        <div class="log-info">
          <div class="log-top">
            <h3>{{ log.name }}</h3>
            <span class="date">{{ formatDate(log.date) }}</span>
            <span class="status-badge" :class="log.done ? 'status-done' : 'status-planned'">
              {{ log.done ? 'Done' : 'Planned' }}
            </span>
          </div>
          <div v-if="countdowns[log._id]" class="log-countdown">
            {{ countdowns[log._id] }}
          </div>
          <div class="log-stats">
            <span v-if="log.startTime || log.endTime" class="time-range">
              {{ log.startTime || '?' }} – {{ log.endTime || '?' }}
            </span>
            <span v-if="log.durationMinutes">{{ log.durationMinutes }} min</span>
            <span>{{ log.exercises.length }} exercise{{ log.exercises.length !== 1 ? 's' : '' }}</span>
            <span>{{ totalSets(log) }} sets</span>
            <span v-if="log.workout" class="plan-badge">Plan: {{ log.workout.name }}</span>
          </div>
          <div class="pills">
            <span v-for="entry in log.exercises.slice(0, 4)" :key="entry.exercise?._id" class="pill">
              {{ entry.exercise?.name ?? 'Unknown' }}
            </span>
            <span v-if="log.exercises.length > 4" class="pill pill-more">+{{ log.exercises.length - 4 }} more</span>
          </div>
          <p v-if="log.notes" class="notes">{{ log.notes }}</p>
        </div>
        <div class="log-actions">
          <button class="btn-secondary" @click="router.push(`/logs/${log._id}/edit`)">Edit</button>
          <button class="btn-danger"    @click="toDelete = log">Delete</button>
        </div>
      </div>
    </div>

    <BaseModal v-if="toDelete" title="Delete Log" @close="toDelete = null">
      <p>Delete the log for <strong>{{ toDelete.name }}</strong>? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-secondary" @click="toDelete = null">Cancel</button>
        <button class="btn-danger" :disabled="saving" @click="handleDelete">
          {{ saving ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseModal from '../components/BaseModal.vue';
import { workoutLogsApi } from '../services/api.js';

const router    = useRouter();
const logs      = ref([]);
const loading   = ref(false);
const loadError = ref('');
const saving    = ref(false);
const toDelete  = ref(null);
const countdowns = ref({});
let timer = null;

const filter = ref('all');
const filterOptions = [
  { value: 'all',     label: 'All'     },
  { value: 'done',    label: 'Done'    },
  { value: 'planned', label: 'Planned' },
];
const filteredLogs = computed(() => {
  if (filter.value === 'done')    return logs.value.filter(l =>  l.done);
  if (filter.value === 'planned') return logs.value.filter(l => !l.done);
  return logs.value;
});

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
  return `Starts in ${parts.join(' ')}`;
}

function tick() {
  const now = Date.now();
  const map = {};
  for (const log of logs.value) {
    if (log.done || !log.startTime) continue;
    const t = logDateTime(log).getTime();
    if (t - now > -60_000) map[log._id] = formatCountdown(Math.max(0, t - now));
  }
  countdowns.value = map;
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const totalSets = (log) => log.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0);

async function loadAll() {
  loading.value = true;
  try {
    logs.value = (await workoutLogsApi.list()).data;
    tick();
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally { loading.value = false; }
}

async function handleDelete() {
  saving.value = true;
  try {
    await workoutLogsApi.remove(toDelete.value._id);
    toDelete.value = null;
    await loadAll();
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
    toDelete.value = null;
  } finally { saving.value = false; }
}

onMounted(() => { loadAll(); timer = setInterval(tick, 1000); });
onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.header-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

.filter-tabs { display: flex; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 8px; padding: 0.2rem; gap: 0.2rem; }
.filter-tab {
  background: none; border: none; border-radius: 6px;
  padding: 0.3rem 0.875rem; font-size: 0.8125rem; font-weight: 600;
  color: var(--text-3); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.filter-tab:hover { color: var(--text); }
.filter-tab.active { background: #7ffc03; color: #111827; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }
.list { display: grid; gap: 0.75rem; }
.log-card {
  background: var(--surface); border-radius: 10px; border: 1px solid var(--border); padding: 1.25rem;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
}
.log-info { flex: 1; min-width: 0; }
.log-top { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.375rem; flex-wrap: wrap; }
.log-top h3 { font-size: 1rem; font-weight: 700; }
.date { font-size: 0.8125rem; color: var(--text-3); }

.status-badge {
  font-size: 0.6875rem; font-weight: 600; border-radius: 999px;
  padding: 0.15rem 0.55rem; flex-shrink: 0;
}
.status-done    { background: var(--pill-bg); color: var(--pill-text); }
.status-planned { background: #fef9c3; color: #854d0e; }

.log-countdown {
  font-size: 0.8125rem; font-weight: 700;
  color: var(--pill-text); margin-bottom: 0.375rem;
  font-variant-numeric: tabular-nums;
}
.log-stats { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8125rem; color: var(--text-3); margin-bottom: 0.625rem; }
.plan-badge { color: var(--pill-text); font-weight: 600; }
.time-range { font-variant-numeric: tabular-nums; }
.pills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pill { background: var(--pill-bg); color: var(--pill-text); border-radius: 999px; font-size: 0.75rem; padding: 0.2rem 0.6rem; font-weight: 500; }
.pill-more { background: var(--surface-alt); color: var(--text-3); }
.notes { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic; }
.log-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
</style>
