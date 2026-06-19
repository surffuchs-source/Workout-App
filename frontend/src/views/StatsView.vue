<template>
  <div>
    <div class="view-header">
      <h1>Statistics</h1>
      <span class="drag-hint">drag cards to rearrange</span>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && workouts.length === 0" class="empty">Loading...</div>
    <div v-else-if="workouts.length === 0 && !loading" class="empty">
      No workout data yet. Log some sessions to see stats.
    </div>

    <template v-else>
      <!-- Summary row -->
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-value">{{ workouts.length }}</span>
          <span class="summary-label">Sessions Logged</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ totalSets }}</span>
          <span class="summary-label">Total Sets</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ totalReps }}</span>
          <span class="summary-label">Total Reps</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ totalVolume.toLocaleString() }}</span>
          <span class="summary-label">Total Volume (kg)</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ avgDuration }}</span>
          <span class="summary-label">Avg Duration (min)</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ uniqueExercises }}</span>
          <span class="summary-label">Exercises Used</span>
        </div>
      </div>

      <!-- Draggable chart grid -->
      <div class="stats-grid">
        <div
          v-for="id in cardOrder" :key="id"
          class="chart-card"
          :class="{
            wide:     cardDef(id).wide,
            dragging: dragSrc === id,
            dragover: dragTarget === id,
          }"
          draggable="true"
          @dragstart="onDragStart(id)"
          @dragover.prevent="onDragOver(id)"
          @dragend="onDragEnd"
        >
          <!-- drag handle -->
          <div class="card-drag-handle" title="Drag to reorder">⠿</div>

          <!-- muscle-donut -->
          <template v-if="id === 'muscle-donut'">
            <h2>Muscle Groups Trained</h2>
            <div v-if="!hasMuscleData" class="chart-placeholder">No data yet.</div>
            <div v-else class="donut-wrap"><Doughnut :data="muscleDonutData" :options="donutOptions" /></div>
          </template>

          <!-- category-donut -->
          <template v-else-if="id === 'category-donut'">
            <h2>Training Categories</h2>
            <div v-if="!hasCategoryData" class="chart-placeholder">No data yet.</div>
            <div v-else class="donut-wrap"><Doughnut :data="categoryDonutData" :options="donutOptions" /></div>
          </template>

          <!-- weekday-bar -->
          <template v-else-if="id === 'weekday-bar'">
            <h2>Workouts by Day of Week</h2>
            <div v-if="workouts.length === 0" class="chart-placeholder">No data yet.</div>
            <div v-else class="chart-wrap-sm"><Bar :data="weekdayBarData" :options="weekdayBarOptions" /></div>
          </template>

          <!-- top-exercises -->
          <template v-else-if="id === 'top-exercises'">
            <h2>Top Exercises by Sets</h2>
            <div v-if="topExercises.length === 0" class="chart-placeholder">No data yet.</div>
            <div v-else class="chart-wrap-md"><Bar :data="topExercisesData" :options="topExercisesOptions" /></div>
          </template>

          <!-- volume-line -->
          <template v-else-if="id === 'volume-line'">
            <h2>Volume Over Time (kg)</h2>
            <div v-if="sorted.length < 2" class="chart-placeholder">Need at least 2 sessions.</div>
            <div v-else class="chart-wrap"><Line :data="volumeLineData" :options="volumeLineOptions" /></div>
          </template>

          <!-- overview-line -->
          <template v-else-if="id === 'overview-line'">
            <h2>Reps &amp; Sets per Session</h2>
            <div v-if="sorted.length < 2" class="chart-placeholder">Need at least 2 sessions.</div>
            <div v-else class="chart-wrap"><Line :data="overviewChartData" :options="overviewChartOptions" /></div>
          </template>

          <!-- exercise-progress -->
          <template v-else-if="id === 'exercise-progress'">
            <div class="chart-card-header">
              <h2>Exercise Progress</h2>
              <button type="button" class="picker-trigger" :class="{ placeholder: !selectedExerciseId }" @click="pickerOpen = true">
                {{ selectedExerciseId ? exerciseName(selectedExerciseId) : 'Select an exercise...' }}
                <span class="picker-arrow">▾</span>
              </button>
            </div>
            <div v-if="!selectedExerciseId" class="chart-placeholder">Select an exercise above.</div>
            <div v-else-if="exerciseSessions.length === 0" class="chart-placeholder">No sessions for this exercise.</div>
            <div v-else class="chart-wrap"><Line :data="exerciseChartData" :options="exerciseChartOptions" /></div>
          </template>

          <!-- set-breakdown -->
          <template v-else-if="id === 'set-breakdown'">
            <h2>Set Breakdown — Weight &amp; Reps per Set</h2>
            <div v-if="!selectedExerciseId" class="chart-placeholder">Select an exercise in Exercise Progress first.</div>
            <div v-else-if="exerciseSessions.length === 0" class="chart-placeholder">No sessions for this exercise.</div>
            <div v-else class="chart-wrap"><Line :data="setBreakdownData" :options="setBreakdownOptions" /></div>
          </template>
        </div>
      </div>
    </template>
  </div>

  <!-- Exercise picker -->
  <Teleport to="body">
    <div v-if="pickerOpen" class="picker-overlay" @click.self="pickerOpen = false">
      <div class="picker-modal">
        <div class="picker-header">
          <h3>Choose Exercise</h3>
          <button type="button" class="picker-close" @click="pickerOpen = false">✕</button>
        </div>
        <div class="picker-filters">
          <input v-model="pickerSearch" type="search" placeholder="Search..." class="picker-search" autofocus />
          <div class="pills">
            <button v-for="g in ['', ...muscleGroups]" :key="g" type="button"
              :class="['pill', { active: pickerMuscle === g }]" @click="pickerMuscle = g">
              {{ g === '' ? 'All' : capitalize(g) }}
            </button>
          </div>
        </div>
        <div class="picker-list">
          <div v-if="pickerResults.length === 0" class="picker-empty">No exercises match.</div>
          <div v-for="ex in pickerResults" :key="ex._id" class="picker-entry">
            <div class="picker-row">
              <button type="button" class="picker-item" :class="{ selected: selectedExerciseId === ex._id }" @click="pickExercise(ex)">
                <span class="picker-item-name">{{ ex.name }}</span>
                <span class="picker-item-meta">{{ capitalize(ex.muscleGroup) }}</span>
              </button>
              <button v-if="ex.description" type="button" class="info-btn" :class="{ active: expandedExId === ex._id }"
                @click.stop="expandedExId = expandedExId === ex._id ? null : ex._id" title="Show description">ℹ</button>
            </div>
            <div v-if="expandedExId === ex._id" class="ex-desc">{{ ex.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Line, Doughnut, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { workoutLogsApi, exercisesApi, preferencesApi } from '../services/api.js';
import { isDark } from '../services/useDark.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler,
);

// ── Card order (drag & drop) ──────────────────────────────────────────────────

const DEFAULT_ORDER = [
  'muscle-donut', 'category-donut',
  'weekday-bar',  'top-exercises',
  'volume-line',
  'overview-line',
  'exercise-progress',
  'set-breakdown',
];
const CARD_DEFS = {
  'muscle-donut':      { wide: false },
  'category-donut':    { wide: false },
  'weekday-bar':       { wide: false },
  'top-exercises':     { wide: false },
  'volume-line':       { wide: true  },
  'overview-line':     { wide: true  },
  'exercise-progress': { wide: true  },
  'set-breakdown':     { wide: true  },
};
const cardDef = (id) => CARD_DEFS[id] ?? { wide: false };

const stored    = localStorage.getItem('stats-card-order');
const cardOrder = ref(stored ? JSON.parse(stored) : [...DEFAULT_ORDER]);

async function loadPreferences() {
  try {
    const { data } = await preferencesApi.get();
    if (data.statsCardOrder?.length) {
      // Merge: keep any new cards not yet in the saved order
      const saved    = data.statsCardOrder.filter(id => id in CARD_DEFS);
      const newCards = DEFAULT_ORDER.filter(id => !saved.includes(id));
      cardOrder.value = [...saved, ...newCards];
      localStorage.setItem('stats-card-order', JSON.stringify(cardOrder.value));
    }
  } catch { /* silently fall back to localStorage */ }
}

const dragSrc    = ref(null);
const dragTarget = ref(null);

function onDragStart(id) { dragSrc.value = id; }
function onDragOver(id) {
  if (!dragSrc.value || dragSrc.value === id) { dragTarget.value = id; return; }
  dragTarget.value = id;
  const order = [...cardOrder.value];
  const from  = order.indexOf(dragSrc.value);
  const to    = order.indexOf(id);
  if (from === -1 || to === -1) return;
  order.splice(from, 1);
  order.splice(to, 0, dragSrc.value);
  cardOrder.value = order;
}
function onDragEnd() {
  dragSrc.value    = null;
  dragTarget.value = null;
  const order = cardOrder.value;
  localStorage.setItem('stats-card-order', JSON.stringify(order));
  preferencesApi.update({ statsCardOrder: order }).catch(() => {});
}

// ── Data ──────────────────────────────────────────────────────────────────────

const workouts     = ref([]);
const allExercises = ref([]);
const loading      = ref(false);
const loadError    = ref('');

async function loadAll() {
  loading.value = true;
  try {
    const [wRes, eRes] = await Promise.all([workoutLogsApi.list(), exercisesApi.list()]);
    workouts.value     = wRes.data.filter(l => l.done);
    allExercises.value = eRes.data;
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally { loading.value = false; }
}
onMounted(() => { loadAll(); loadPreferences(); });

const sorted = computed(() => [...workouts.value].sort((a, b) => new Date(a.date) - new Date(b.date)));
const fmt    = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Summary stats
const totalSets = computed(() =>
  workouts.value.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0));
const totalReps = computed(() =>
  workouts.value.reduce((n, w) =>
    n + w.exercises.reduce((m, e) => m + e.sets.reduce((s, set) => s + (set.reps || 0), 0), 0), 0));
const totalVolume = computed(() =>
  Math.round(workouts.value.reduce((n, w) =>
    n + w.exercises.reduce((m, e) =>
      m + e.sets.reduce((s, set) => s + (set.reps || 0) * (set.weightKg || 0), 0), 0), 0)));
const avgDuration = computed(() => {
  const sessions = workouts.value.filter(w => w.durationMinutes);
  if (!sessions.length) return '—';
  return Math.round(sessions.reduce((s, w) => s + w.durationMinutes, 0) / sessions.length);
});
const uniqueExercises = computed(() => {
  const ids = new Set();
  for (const w of workouts.value)
    for (const e of w.exercises)
      ids.add(String(e.exercise?._id ?? e.exercise));
  return ids.size;
});

// ── Shared helpers ────────────────────────────────────────────────────────────

const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const capitalize   = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const grid         = computed(() => isDark.value ? '#1e293b' : '#f1f5f9');
const rColor       = computed(() => isDark.value ? '#a3e635' : '#3a6e00');

function exSets() {
  const counts = {};
  for (const w of workouts.value)
    for (const entry of w.exercises) {
      const exId = entry.exercise?._id ?? entry.exercise;
      const ex   = allExercises.value.find(e => e._id === exId);
      if (!ex) continue;
      if (!counts[exId]) counts[exId] = { ex, sets: 0 };
      counts[exId].sets += entry.sets.length;
    }
  return counts;
}

// ── Muscle group donut ────────────────────────────────────────────────────────

const MUSCLE_COLORS = {
  chest: '#ef4444', back: '#3b82f6', shoulders: '#f97316',
  arms: '#8b5cf6', legs: '#10b981', core: '#f59e0b',
  'full body': '#06b6d4', cardio: '#ec4899',
};

const muscleGroupSets = computed(() => {
  const c = {};
  for (const [, { ex, sets }] of Object.entries(exSets()))
    c[ex.muscleGroup] = (c[ex.muscleGroup] ?? 0) + sets;
  return c;
});
const hasMuscleData   = computed(() => Object.keys(muscleGroupSets.value).length > 0);
const muscleDonutData = computed(() => {
  const entries = Object.entries(muscleGroupSets.value).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map(([g]) => capitalize(g)),
    datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([g]) => MUSCLE_COLORS[g] ?? '#94a3b8'), borderWidth: 2, borderColor: 'transparent', hoverOffset: 8 }],
  };
});

// ── Category donut ────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  strength: '#3b82f6', hypertrophy: '#8b5cf6',
  endurance: '#10b981', cardio: '#ec4899', flexibility: '#f59e0b',
};

const categorySets = computed(() => {
  const c = {};
  for (const [, { ex, sets }] of Object.entries(exSets()))
    c[ex.category] = (c[ex.category] ?? 0) + sets;
  return c;
});
const hasCategoryData   = computed(() => Object.keys(categorySets.value).length > 0);
const categoryDonutData = computed(() => {
  const entries = Object.entries(categorySets.value).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map(([g]) => capitalize(g)),
    datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([g]) => CATEGORY_COLORS[g] ?? '#94a3b8'), borderWidth: 2, borderColor: 'transparent', hoverOffset: 8 }],
  };
});

const donutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} sets` } } } };

// ── Workouts by day of week ───────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekdayCounts = computed(() => {
  const c = new Array(7).fill(0);
  for (const w of workouts.value) c[(new Date(w.date).getDay() + 6) % 7]++;
  return c;
});
const weekdayBarData = computed(() => ({
  labels: DAYS,
  datasets: [{ label: 'Sessions', data: weekdayCounts.value, backgroundColor: DAYS.map((_, i) => `hsl(${i * 51},70%,55%)`), borderRadius: 4 }],
}));
const weekdayBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { color: grid.value } }, y: { beginAtZero: true, grid: { color: grid.value }, ticks: { stepSize: 1 } } },
}));

// ── Top exercises ─────────────────────────────────────────────────────────────

const topExercises = computed(() =>
  Object.values(exSets())
    .map(({ ex, sets }) => ({ name: ex.name, sets }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 10)
);
const topExercisesData = computed(() => ({
  labels: topExercises.value.map(e => e.name),
  datasets: [{ label: 'Sets', data: topExercises.value.map(e => e.sets), backgroundColor: '#7ffc03', borderRadius: 4 }],
}));
const topExercisesOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true, grid: { color: grid.value } }, y: { grid: { color: grid.value } } },
}));

// ── Volume over time ──────────────────────────────────────────────────────────

const volumeLineData = computed(() => ({
  labels: sorted.value.map(w => fmt(w.date)),
  datasets: [{
    label: 'Volume (kg)', fill: true, tension: 0.35,
    data: sorted.value.map(w => Math.round(w.exercises.reduce((n, e) => n + e.sets.reduce((s, set) => s + (set.reps || 0) * (set.weightKg || 0), 0), 0))),
    borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.12)',
    pointRadius: 4, pointHoverRadius: 6,
  }],
}));
const volumeLineOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'top' } },
  scales: { x: { grid: { color: grid.value } }, y: { beginAtZero: true, grid: { color: grid.value } } },
}));

// ── Reps & Sets overview ──────────────────────────────────────────────────────

const overviewChartData = computed(() => ({
  labels: sorted.value.map(w => fmt(w.date)),
  datasets: [
    { label: 'Total Reps', data: sorted.value.map(w => w.exercises.reduce((s, e) => s + e.sets.reduce((r, set) => r + (set.reps || 0), 0), 0)), borderColor: '#3a6e00', backgroundColor: 'rgba(58,110,0,0.12)', tension: 0.35, fill: true, yAxisID: 'y', pointRadius: 4, pointHoverRadius: 6 },
    { label: 'Total Sets', data: sorted.value.map(w => w.exercises.reduce((s, e) => s + e.sets.length, 0)), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', tension: 0.35, fill: true, yAxisID: 'y1', pointRadius: 4, pointHoverRadius: 6 },
  ],
}));
const overviewChartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'top' } },
  scales: {
    x: { grid: { color: grid.value } },
    y:  { type: 'linear', position: 'left',  beginAtZero: true, grid: { color: grid.value }, title: { display: true, text: 'Reps',  color: rColor.value, font: { weight: '600' } } },
    y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Sets', color: '#10b981', font: { weight: '600' } } },
  },
}));

// ── Exercise progress ─────────────────────────────────────────────────────────

const selectedExerciseId = ref('');
const pickerOpen    = ref(false);
const pickerSearch  = ref('');
const pickerMuscle  = ref('');
const expandedExId  = ref(null);
const pickerResults = computed(() => {
  let list = allExercises.value;
  if (pickerMuscle.value) list = list.filter(ex => ex.muscleGroup === pickerMuscle.value);
  const q = pickerSearch.value.trim().toLowerCase();
  if (q) list = list.filter(ex => ex.name.toLowerCase().includes(q));
  return list;
});
function pickExercise(ex) { selectedExerciseId.value = ex._id; pickerOpen.value = false; expandedExId.value = null; }
function exerciseName(id) { return allExercises.value.find(ex => ex._id === id)?.name ?? id; }

const exerciseSessions = computed(() => {
  if (!selectedExerciseId.value) return [];
  return sorted.value.map(w => {
    const entry = w.exercises.find(e => String(e.exercise?._id ?? e.exercise) === selectedExerciseId.value);
    if (!entry) return null;
    return { date: w.date, sets: entry.sets, reps: entry.sets.reduce((s, set) => s + (set.reps || 0), 0), maxWeight: Math.max(0, ...entry.sets.map(s => s.weightKg || 0)) };
  }).filter(Boolean);
});

const exerciseChartData = computed(() => ({
  labels: exerciseSessions.value.map(s => fmt(s.date)),
  datasets: [
    { label: 'Total Reps', data: exerciseSessions.value.map(s => s.reps), borderColor: '#3a6e00', backgroundColor: 'rgba(58,110,0,0.12)', tension: 0.35, fill: true, yAxisID: 'y', pointRadius: 4, pointHoverRadius: 6 },
    { label: 'Max Weight (kg)', data: exerciseSessions.value.map(s => s.maxWeight), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)', tension: 0.35, fill: false, yAxisID: 'y1', pointRadius: 4, pointHoverRadius: 6 },
  ],
}));
const exerciseChartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'top' } },
  scales: {
    x: { grid: { color: grid.value } },
    y:  { type: 'linear', position: 'left',  beginAtZero: true, grid: { color: grid.value }, title: { display: true, text: 'Reps',       color: rColor.value, font: { weight: '600' } } },
    y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Weight (kg)', color: '#f97316',     font: { weight: '600' } } },
  },
}));

// ── Set breakdown ─────────────────────────────────────────────────────────────

const SET_COLORS = ['#3a6e00', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#0ea5e9'];
const setBreakdownData = computed(() => {
  if (!exerciseSessions.value.length) return null;
  const sessions = exerciseSessions.value.slice(-6);
  const maxSets  = Math.max(...sessions.map(s => s.sets.length));
  const labels   = Array.from({ length: maxSets }, (_, i) => `Set ${i + 1}`);
  return {
    labels,
    datasets: [
      ...sessions.map((s, i) => ({ label: fmt(s.date) + ' — kg', data: Array.from({ length: maxSets }, (_, j) => s.sets[j]?.weightKg ?? null), borderColor: SET_COLORS[i % SET_COLORS.length], backgroundColor: SET_COLORS[i % SET_COLORS.length] + '22', tension: 0.2, fill: false, spanGaps: false, pointRadius: 5, pointHoverRadius: 7, yAxisID: 'y' })),
      ...sessions.map((s, i) => ({ label: fmt(s.date) + ' — reps', data: Array.from({ length: maxSets }, (_, j) => s.sets[j]?.reps ?? null), borderColor: SET_COLORS[i % SET_COLORS.length], backgroundColor: 'transparent', borderDash: [5, 4], tension: 0.2, fill: false, spanGaps: false, pointRadius: 5, pointHoverRadius: 7, yAxisID: 'y1' })),
    ],
  };
});
const setBreakdownOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'top' } },
  scales: {
    x: { grid: { color: grid.value } },
    y:  { type: 'linear', position: 'left',  beginAtZero: true, grid: { color: grid.value }, title: { display: true, text: 'Weight (kg)', color: '#f97316',     font: { weight: '600' } } },
    y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Reps',       color: rColor.value, font: { weight: '600' } } },
  },
}));
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.drag-hint { font-size: 0.75rem; color: var(--text-muted); }
.empty { text-align: center; color: var(--text); padding: 3rem; }

/* Summary */
.summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
.summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.summary-value { font-size: 1.5rem; font-weight: 800; color: var(--pill-text); line-height: 1; }
.summary-label { font-size: 0.75rem; color: var(--text-2); font-weight: 500; text-align: center; }

/* Grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.chart-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 1.25rem 1.5rem 1.5rem; position: relative;
  transition: opacity 0.2s, box-shadow 0.2s;
  cursor: grab;
}
.chart-card.wide { grid-column: 1 / -1; }
.chart-card.dragging { opacity: 0.4; cursor: grabbing; }
.chart-card.dragover { box-shadow: 0 0 0 2px #7ffc03; }
.chart-card h2 { font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem; }
.chart-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.chart-card-header h2 { margin-bottom: 0; }
.card-drag-handle { position: absolute; top: 0.75rem; right: 0.75rem; font-size: 1rem; color: var(--text-muted); cursor: grab; user-select: none; }

/* Chart containers */
.chart-wrap    { position: relative; height: 320px; }
.chart-wrap-sm { position: relative; height: 220px; }
.chart-wrap-md { position: relative; height: 280px; }
.donut-wrap    { position: relative; height: 240px; }
.chart-placeholder { text-align: center; color: var(--text-muted); padding: 3rem 0; font-size: 0.9rem; }

/* Picker trigger */
.picker-trigger { display: flex; align-items: center; gap: 0.5rem; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.75rem; font-size: 0.875rem; color: var(--text); cursor: pointer; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: border-color 0.15s; }
.picker-trigger:hover { border-color: #7ffc03; }
.picker-trigger.placeholder { color: var(--text-muted); }
.picker-arrow { color: var(--text-3); font-size: 0.75rem; flex-shrink: 0; }

/* Picker modal */
.picker-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.picker-modal { background: var(--surface); border-radius: 10px; width: 100%; max-width: 560px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.picker-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.picker-header h3 { font-size: 1rem; font-weight: 700; }
.picker-close { background: none; border: none; font-size: 1rem; color: var(--text-3); cursor: pointer; padding: 0.25rem; }
.picker-filters { padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; gap: 0.625rem; }
.picker-search { width: 100%; }
.pills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pill { padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; border: 1px solid var(--border); background: var(--surface); color: var(--text-2); cursor: pointer; }
.pill:hover { background: var(--surface-alt); }
.pill.active { background: #7ffc03; color: #111827; border-color: #7ffc03; }
.picker-list { overflow-y: auto; padding: 0.5rem; }
.picker-empty { text-align: center; color: var(--text-muted); padding: 2rem; }
.picker-entry { border-radius: 6px; overflow: hidden; }
.picker-row { display: flex; align-items: center; }
.picker-row .picker-item { flex: 1; border-radius: 0; }
.picker-item { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 0.875rem; border-radius: 6px; border: none; background: transparent; text-align: left; cursor: pointer; color: var(--text); transition: background 0.1s; }
.picker-item:hover { background: var(--surface-alt); }
.picker-item.selected { background: #e8fff0; color: #1a5c00; }
.picker-item-name { font-size: 0.875rem; font-weight: 500; }
.picker-item-meta { font-size: 0.75rem; color: var(--text-3); flex-shrink: 0; }
.info-btn { flex-shrink: 0; width: 2rem; height: 2rem; padding: 0; background: none; border: none; color: var(--text-3); font-size: 0.875rem; cursor: pointer; border-radius: 6px; transition: background 0.1s, color 0.1s; }
.info-btn:hover { background: var(--surface-alt); color: var(--text); }
.info-btn.active { color: #7ffc03; }
.ex-desc { font-size: 0.8rem; color: var(--text-2); line-height: 1.55; padding: 0.625rem 0.875rem; background: var(--surface-alt); border-top: 1px solid var(--border); }

@media (max-width: 700px) {
  .summary-grid { grid-template-columns: repeat(3, 1fr); }
  .stats-grid   { grid-template-columns: 1fr; }
  .chart-card.wide { grid-column: unset; }
}
</style>
