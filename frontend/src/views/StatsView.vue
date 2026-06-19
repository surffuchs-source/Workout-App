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

      <!-- Muscle group donut -->
      <div class="chart-card donut-card">
        <h2>Muscle Groups Trained</h2>
        <div v-if="Object.keys(muscleGroupSets).length === 0" class="chart-placeholder">
          No data yet.
          No data yet.
        </div>
        <div v-else class="donut-wrap">
          <Doughnut :data="donutChartData" :options="donutChartOptions" />
        </div>
      </div>

      <!-- Per-exercise progress -->
      <div class="chart-card">
        <div class="chart-card-header">
          <h2>Exercise Progress</h2>
          <button
            type="button"
            class="picker-trigger"
            :class="{ placeholder: !selectedExerciseId }"
            @click="pickerOpen = true"
          >
            {{ selectedExerciseId ? exerciseName(selectedExerciseId) : 'Select an exercise...' }}
            <span class="picker-arrow">▾</span>
          </button>
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
            <button
              v-for="g in ['', ...muscleGroups]" :key="g"
              type="button"
              :class="['pill', { active: pickerMuscle === g }]"
              @click="pickerMuscle = g"
            >{{ g === '' ? 'All' : capitalize(g) }}</button>
          </div>
        </div>
        <div class="picker-list">
          <div v-if="pickerResults.length === 0" class="picker-empty">No exercises match.</div>
          <div v-for="ex in pickerResults" :key="ex._id" class="picker-entry">
            <div class="picker-row">
              <button
                type="button"
                class="picker-item"
                :class="{ selected: selectedExerciseId === ex._id }"
                @click="pickExercise(ex)"
              >
                <span class="picker-item-name">{{ ex.name }}</span>
                <span class="picker-item-meta">{{ capitalize(ex.muscleGroup) }}</span>
              </button>
              <button
                v-if="ex.description"
                type="button"
                class="info-btn"
                :class="{ active: expandedExId === ex._id }"
                @click.stop="expandedExId = expandedExId === ex._id ? null : ex._id"
                title="Show description"
              >ℹ</button>
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
import { Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { workoutLogsApi, exercisesApi } from '../services/api.js';
import { isDark } from '../services/useDark.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const workouts           = ref([]);
const allExercises       = ref([]);
const loading            = ref(false);
const loadError          = ref('');
const selectedExerciseId = ref('');

const muscleGroups  = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const capitalize    = (s) => s.charAt(0).toUpperCase() + s.slice(1);
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

// ── Muscle group donut ────────────────────────────────────────────────────────

const MUSCLE_COLORS = {
  chest:       '#ef4444',
  back:        '#3b82f6',
  shoulders:   '#f97316',
  arms:        '#8b5cf6',
  legs:        '#10b981',
  core:        '#f59e0b',
  'full body': '#06b6d4',
  cardio:      '#ec4899',
};

const muscleGroupSets = computed(() => {
  const counts = {};
  for (const w of workouts.value) {
    for (const entry of w.exercises) {
      const exId = entry.exercise?._id ?? entry.exercise;
      const ex   = allExercises.value.find(e => e._id === exId);
      if (!ex) continue;
      const group = ex.muscleGroup;
      counts[group] = (counts[group] ?? 0) + entry.sets.length;
    }
  }
  return counts;
});

const donutChartData = computed(() => {
  const entries = Object.entries(muscleGroupSets.value)
    .sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map(([g]) => capitalize(g)),
    datasets: [{
      data:            entries.map(([, v]) => v),
      backgroundColor: entries.map(([g]) => MUSCLE_COLORS[g] ?? '#94a3b8'),
      borderWidth: 2,
      borderColor: 'transparent',
      hoverOffset: 8,
    }],
  };
});

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.parsed} sets`,
      },
    },
  },
};

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
.picker-trigger {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.4rem 0.75rem; font-size: 0.875rem; color: var(--text); cursor: pointer;
  max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: border-color 0.15s;
}
.picker-trigger:hover { border-color: #7ffc03; }
.picker-trigger.placeholder { color: var(--text-muted); }
.picker-arrow { color: var(--text-3); font-size: 0.75rem; flex-shrink: 0; }
.picker-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 1rem;
}
.picker-modal {
  background: var(--surface); border-radius: 10px;
  width: 100%; max-width: 560px; max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.picker-header h3 { font-size: 1rem; font-weight: 700; }
.picker-close { background: none; border: none; font-size: 1rem; color: var(--text-3); cursor: pointer; padding: 0.25rem; }
.picker-filters { padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; gap: 0.625rem; }
.picker-search { width: 100%; }
.pills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pill {
  padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-2); cursor: pointer;
}
.pill:hover { background: var(--surface-alt); }
.pill.active { background: #7ffc03; color: #111827; border-color: #7ffc03; }
.picker-list { overflow-y: auto; padding: 0.5rem; }
.picker-empty { text-align: center; color: var(--text-muted); padding: 2rem; }
.picker-entry { border-radius: 6px; overflow: hidden; }
.picker-row { display: flex; align-items: center; }
.picker-row .picker-item { flex: 1; border-radius: 0; }
.picker-item {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 0.625rem 0.875rem; border-radius: 6px; border: none;
  background: transparent; text-align: left; cursor: pointer; color: var(--text);
  transition: background 0.1s;
}
.picker-item:hover { background: var(--surface-alt); }
.picker-item.selected { background: #e8fff0; color: #1a5c00; }
.picker-item-name { font-size: 0.875rem; font-weight: 500; }
.picker-item-meta { font-size: 0.75rem; color: var(--text-3); flex-shrink: 0; }
.info-btn {
  flex-shrink: 0; width: 2rem; height: 2rem; padding: 0;
  background: none; border: none; color: var(--text-3);
  font-size: 0.875rem; cursor: pointer; border-radius: 6px;
  transition: background 0.1s, color 0.1s;
}
.info-btn:hover { background: var(--surface-alt); color: var(--text); }
.info-btn.active { color: #7ffc03; }
.ex-desc {
  font-size: 0.8rem; color: var(--text-2); line-height: 1.55;
  padding: 0.625rem 0.875rem; background: var(--surface-alt);
  border-top: 1px solid var(--border);
}
.chart-wrap { position: relative; height: 320px; }
.donut-wrap { position: relative; height: 280px; }
.donut-card { display: flex; flex-direction: column; }
.chart-placeholder { text-align: center; color: var(--text); padding: 3rem 0; font-size: 0.9375rem; }

@media (max-width: 600px) {
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
