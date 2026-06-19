<template>
  <div>
    <div class="view-header">
      <h1>Statistics</h1>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && workouts.length === 0" class="empty">Loading...</div>
    <div v-else-if="workouts.length === 0 && !loading" class="empty">
      No workout data yet. Log some sessions to see stats.
    </div>

    <template v-else>
      <!-- Summary cards -->
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
      </div>

      <!-- Reps & Sets over time -->
      <div class="chart-card">
        <h2>Reps &amp; Sets per Session</h2>
        <div class="chart-wrap">
          <Line :data="overviewChartData" :options="overviewChartOptions" />
        </div>
      </div>

      <!-- Per-exercise progress -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h2>Exercise Progress</h2>
          <select v-model="selectedExerciseId">
            <option value="">Select an exercise...</option>
            <option v-for="ex in allExercises" :key="ex._id" :value="ex._id">{{ ex.name }}</option>
          </select>
        </div>
        <div v-if="!selectedExerciseId" class="chart-placeholder">
          Select an exercise above to view its reps and weight progression over time.
        </div>
        <div v-else-if="exerciseSessions.length === 0" class="chart-placeholder">
          No sessions found for this exercise.
        </div>
        <div v-else class="chart-wrap">
          <Line :data="exerciseChartData" :options="exerciseChartOptions" />
        </div>
      </div>

      <!-- Set breakdown per exercise -->
      <div v-if="selectedExerciseId" class="chart-card">
        <h2>Set Breakdown — Weight &amp; Reps per Set</h2>
        <div v-if="exerciseSessions.length === 0" class="chart-placeholder">
          No sessions found for this exercise.
        </div>
        <div v-else class="chart-wrap">
          <Line :data="setBreakdownData" :options="setBreakdownOptions" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { workoutLogsApi, exercisesApi } from '../services/api.js';
import { isDark } from '../services/useDark.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const workouts           = ref([]);
const allExercises       = ref([]);
const loading            = ref(false);
const loadError          = ref('');
const selectedExerciseId = ref('');

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

const sorted = computed(() =>
  [...workouts.value].sort((a, b) => new Date(a.date) - new Date(b.date))
);

const totalSets = computed(() =>
  workouts.value.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0)
);
const totalReps = computed(() =>
  workouts.value.reduce((n, w) =>
    n + w.exercises.reduce((m, e) =>
      m + e.sets.reduce((s, set) => s + (set.reps || 0), 0), 0), 0)
);
const totalVolume = computed(() =>
  Math.round(workouts.value.reduce((n, w) =>
    n + w.exercises.reduce((m, e) =>
      m + e.sets.reduce((s, set) => s + (set.reps || 0) * (set.weightKg || 0), 0), 0), 0))
);

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Overview chart ────────────────────────────────────────────────────────────

const overviewChartData = computed(() => ({
  labels: sorted.value.map(w => fmt(w.date)),
  datasets: [
    {
      label: 'Total Reps',
      data: sorted.value.map(w =>
        w.exercises.reduce((s, e) => s + e.sets.reduce((r, set) => r + (set.reps || 0), 0), 0)
      ),
      borderColor: '#3a6e00',
      backgroundColor: 'rgba(58,110,0,0.12)',
      tension: 0.35, fill: true, yAxisID: 'y',
      pointRadius: 4, pointHoverRadius: 6,
    },
    {
      label: 'Total Sets',
      data: sorted.value.map(w =>
        w.exercises.reduce((s, e) => s + e.sets.length, 0)
      ),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.12)',
      tension: 0.35, fill: true, yAxisID: 'y1',
      pointRadius: 4, pointHoverRadius: 6,
    },
  ],
}));

const overviewChartOptions = computed(() => {
  const grid   = isDark.value ? '#1e293b' : '#f1f5f9';
  const rColor = isDark.value ? '#a3e635' : '#3a6e00';
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { color: grid } },
      y: {
        type: 'linear', position: 'left', beginAtZero: true,
        grid: { color: grid },
        title: { display: true, text: 'Reps', color: rColor, font: { weight: '600' } },
      },
      y1: {
        type: 'linear', position: 'right', beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Sets', color: '#10b981', font: { weight: '600' } },
      },
    },
  };
});

// ── Exercise progress chart ───────────────────────────────────────────────────

const exerciseSessions = computed(() => {
  if (!selectedExerciseId.value) return [];
  return sorted.value
    .map(w => {
      const entry = w.exercises.find(e =>
        String(e.exercise?._id ?? e.exercise) === selectedExerciseId.value
      );
      if (!entry) return null;
      return {
        date:      w.date,
        sets:      entry.sets,
        reps:      entry.sets.reduce((s, set) => s + (set.reps || 0), 0),
        maxWeight: Math.max(0, ...entry.sets.map(s => s.weightKg || 0)),
      };
    })
    .filter(Boolean);
});

// ── Set breakdown chart ───────────────────────────────────────────────────────

const SET_COLORS = ['#3a6e00', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#0ea5e9'];

const setBreakdownData = computed(() => {
  if (exerciseSessions.value.length === 0) return null;
  const sessions = exerciseSessions.value.slice(-6);
  const maxSets  = Math.max(...sessions.map(s => s.sets.length));
  const labels   = Array.from({ length: maxSets }, (_, i) => `Set ${i + 1}`);

  const weightDatasets = sessions.map((s, idx) => ({
    label:           fmt(s.date) + ' — kg',
    data:            Array.from({ length: maxSets }, (_, i) => s.sets[i]?.weightKg ?? null),
    borderColor:     SET_COLORS[idx % SET_COLORS.length],
    backgroundColor: SET_COLORS[idx % SET_COLORS.length] + '22',
    tension: 0.2, fill: false, spanGaps: false,
    pointRadius: 5, pointHoverRadius: 7,
    yAxisID: 'y',
  }));

  const repsDatasets = sessions.map((s, idx) => ({
    label:           fmt(s.date) + ' — reps',
    data:            Array.from({ length: maxSets }, (_, i) => s.sets[i]?.reps ?? null),
    borderColor:     SET_COLORS[idx % SET_COLORS.length],
    backgroundColor: 'transparent',
    borderDash:      [5, 4],
    tension: 0.2, fill: false, spanGaps: false,
    pointRadius: 5, pointHoverRadius: 7,
    yAxisID: 'y1',
  }));

  return { labels, datasets: [...weightDatasets, ...repsDatasets] };
});

const setBreakdownOptions = computed(() => {
  const grid   = isDark.value ? '#1e293b' : '#f1f5f9';
  const rColor = isDark.value ? '#a3e635' : '#3a6e00';
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { color: grid } },
      y: {
        type: 'linear', position: 'left', beginAtZero: true,
        grid: { color: grid },
        title: { display: true, text: 'Weight (kg)', color: '#f97316', font: { weight: '600' } },
      },
      y1: {
        type: 'linear', position: 'right', beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Reps', color: rColor, font: { weight: '600' } },
      },
    },
  };
});

const exerciseChartData = computed(() => ({
  labels: exerciseSessions.value.map(s => fmt(s.date)),
  datasets: [
    {
      label: 'Total Reps',
      data: exerciseSessions.value.map(s => s.reps),
      borderColor: '#3a6e00',
      backgroundColor: 'rgba(58,110,0,0.12)',
      tension: 0.35, fill: true, yAxisID: 'y',
      pointRadius: 4, pointHoverRadius: 6,
    },
    {
      label: 'Max Weight (kg)',
      data: exerciseSessions.value.map(s => s.maxWeight),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.08)',
      tension: 0.35, fill: false, yAxisID: 'y1',
      pointRadius: 4, pointHoverRadius: 6,
    },
  ],
}));

const exerciseChartOptions = computed(() => {
  const grid   = isDark.value ? '#1e293b' : '#f1f5f9';
  const rColor = isDark.value ? '#a3e635' : '#3a6e00';
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { color: grid } },
      y: {
        type: 'linear', position: 'left', beginAtZero: true,
        grid: { color: grid },
        title: { display: true, text: 'Reps', color: rColor, font: { weight: '600' } },
      },
      y1: {
        type: 'linear', position: 'right', beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Weight (kg)', color: '#f97316', font: { weight: '600' } },
      },
    },
  };
});

onMounted(loadAll);
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.empty { text-align: center; color: var(--text); padding: 3rem; }

.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
.summary-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
}
.summary-value { font-size: 1.75rem; font-weight: 800; color: var(--pill-text); line-height: 1; }
.summary-label { font-size: 0.8125rem; color: var(--text); font-weight: 500; }

.chart-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 1.5rem; margin-bottom: 1.25rem;
}
.chart-card h2 { font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem; }
.chart-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.25rem;
}
.chart-card-header h2 { margin-bottom: 0; }
.chart-card-header select { width: auto; max-width: 220px; }
.chart-wrap { position: relative; height: 320px; }
.chart-placeholder { text-align: center; color: var(--text); padding: 3rem 0; font-size: 0.9375rem; }

@media (max-width: 600px) {
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
