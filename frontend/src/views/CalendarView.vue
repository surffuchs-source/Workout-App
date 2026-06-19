<template>
  <div>
    <div class="view-header">
      <h1>Calendar</h1>
      <span v-if="loading" class="loading-badge">Loading...</span>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>

    <div class="calendar">
      <div class="cal-nav">
        <button class="btn-secondary" @click="prevMonth">&#8249;</button>
        <h2>{{ monthName }} {{ currentYear }}</h2>
        <button class="btn-secondary" @click="nextMonth">&#8250;</button>
      </div>

      <!-- Desktop grid -->
      <div class="desktop-cal">
        <div class="weekdays">
          <span v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</span>
        </div>
        <div class="days-grid">
          <div
            v-for="(cell, i) in calendarDays"
            :key="i"
            class="day-cell"
            :class="{ 'other-month': !cell.currentMonth, 'is-today': isToday(cell.date) }"
          >
            <span class="day-num">{{ cell.date.getDate() }}</span>
            <button
              v-for="w in cell.workouts"
              :key="w._id"
              class="workout-pill"
              :class="{ 'workout-pill--pending': !w.done }"
              @click="selected = w"
            >{{ w.name }}</button>
          </div>
        </div>
      </div>

      <!-- Mobile agenda -->
      <div class="mobile-agenda">
        <div v-if="agendaItems.length === 0" class="agenda-empty">
          No workouts this month.
        </div>
        <div
          v-for="item in agendaItems"
          :key="item._id"
          class="agenda-row"
          :class="{ 'agenda-row--pending': !item.done }"
          @click="selected = item"
        >
          <div class="agenda-date">
            <span class="agenda-day">{{ item.dayNum }}</span>
            <span class="agenda-dow">{{ item.dow }}</span>
          </div>
          <div class="agenda-info">
            <span class="agenda-name">{{ item.name }}</span>
            <span v-if="item.startTime" class="agenda-time">{{ item.startTime }}</span>
          </div>
          <span class="agenda-badge">{{ item.done ? 'Done' : 'Planned' }}</span>
        </div>
      </div>
    </div>

    <!-- Workout detail modal -->
    <BaseModal v-if="selected" :title="selected.name" @close="selected = null">
      <div class="detail">
        <div class="detail-meta">
          <span>{{ formatDate(selected.date) }}</span>
          <span v-if="selected.startTime || selected.endTime">
            {{ selected.startTime || '?' }} – {{ selected.endTime || '?' }}
          </span>
          <span v-if="selected.durationMinutes">{{ selected.durationMinutes }} min</span>
          <span>{{ selected.exercises.length }} exercise{{ selected.exercises.length !== 1 ? 's' : '' }}</span>
        </div>
        <p v-if="selected.notes" class="detail-notes">{{ selected.notes }}</p>

        <div v-for="(entry, i) in selected.exercises" :key="i" class="exercise-block">
          <div class="exercise-block-header">
            <span class="ex-name">{{ entry.exercise?.name ?? 'Unknown' }}</span>
            <span class="ex-muscle">{{ entry.exercise?.muscleGroup }}</span>
          </div>
          <table>
            <thead>
              <tr><th>Set</th><th>Reps</th><th>Weight (kg)</th><th>Rest (s)</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in entry.sets" :key="s.setNumber">
                <td>{{ s.setNumber }}</td>
                <td>{{ s.reps }}</td>
                <td>{{ s.weightKg }}</td>
                <td>{{ s.restSeconds }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import BaseModal from '../components/BaseModal.vue';
import { workoutLogsApi } from '../services/api.js';

const workouts  = ref([]);
const loading   = ref(false);
const loadError = ref('');
const selected  = ref(null);

const today        = new Date();
const currentYear  = ref(today.getFullYear());
const currentMonth = ref(today.getMonth());

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthName = computed(() => MONTHS[currentMonth.value]);

function prevMonth() {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value--; }
  else currentMonth.value--;
}
function nextMonth() {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++; }
  else currentMonth.value++;
}

function isToday(date) {
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth() &&
    date.getDate()     === today.getDate();
}

function workoutsForDate(date) {
  return workouts.value.filter(w => {
    const d = new Date(w.date);
    return d.getFullYear() === date.getFullYear() &&
           d.getMonth()    === date.getMonth() &&
           d.getDate()     === date.getDate();
  });
}

const calendarDays = computed(() => {
  const year  = currentYear.value;
  const month = currentMonth.value;
  const firstDow       = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, daysInPrevMonth - i);
    cells.push({ date, currentMonth: false, workouts: workoutsForDate(date) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, currentMonth: true, workouts: workoutsForDate(date) });
  }
  const tail = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= tail; d++) {
    const date = new Date(year, month + 1, d);
    cells.push({ date, currentMonth: false, workouts: workoutsForDate(date) });
  }
  return cells;
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const agendaItems = computed(() => {
  const year  = currentYear.value;
  const month = currentMonth.value;
  return workouts.value
    .filter(w => {
      const d = new Date(w.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(w => {
      const d = new Date(w.date);
      return { ...w, dayNum: d.getDate(), dow: DAYS[d.getDay()] };
    });
});

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

async function loadWorkouts() {
  loading.value = true;
  try { workouts.value = (await workoutLogsApi.list()).data; }
  catch (e) { loadError.value = e.response?.data?.error ?? e.message; }
  finally { loading.value = false; }
}

onMounted(loadWorkouts);
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.loading-badge { font-size: 0.8125rem; color: var(--text-muted); }

.calendar { background: var(--surface); border-radius: 10px; border: 1px solid var(--border); overflow: hidden; }

.cal-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
}
.cal-nav h2 { font-size: 1.125rem; font-weight: 700; min-width: 180px; text-align: center; }
.cal-nav button { font-size: 1.25rem; padding: 0.25rem 0.75rem; }

.weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  background: var(--surface-alt); border-bottom: 1px solid var(--border);
}
.weekdays span {
  text-align: center; font-size: 0.75rem; font-weight: 600;
  color: var(--text-3); padding: 0.625rem 0;
}

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); }

.day-cell {
  min-height: 110px; padding: 0.5rem;
  border-right: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light);
  display: flex; flex-direction: column; gap: 0.25rem;
}
.day-cell:nth-child(7n) { border-right: none; }

.other-month .day-num { color: var(--text-muted); }
.other-month { background: var(--surface-alt); }

.is-today .day-num {
  background: #7ffc03; color: #111827;
  width: 1.625rem; height: 1.625rem;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}

.day-num {
  font-size: 0.8125rem; font-weight: 600; color: var(--text);
  width: 1.625rem; height: 1.625rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.workout-pill {
  display: block; width: 100%; text-align: left;
  border: none; border-radius: 4px;
  font-size: 0.6875rem; font-weight: 600;
  padding: 0.2rem 0.4rem;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: background 0.15s;
}
.workout-pill { background: var(--pill-bg); color: var(--pill-text); }
.workout-pill:hover { background: #d0ff8a; }
.workout-pill--pending { background: #fef9c3; color: #854d0e; }
.workout-pill--pending:hover { background: #fef08a; }

/* Detail modal */
.detail-meta {
  display: flex; gap: 1.25rem; flex-wrap: wrap;
  font-size: 0.875rem; color: var(--text-3);
  margin-bottom: 1rem; padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}
.detail-notes { font-style: italic; color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; }

.exercise-block { margin-bottom: 1.5rem; }
.exercise-block-header {
  display: flex; align-items: baseline; gap: 0.625rem;
  margin-bottom: 0.5rem;
}
.ex-name { font-weight: 700; font-size: 0.9375rem; }
.ex-muscle {
  font-size: 0.75rem; font-weight: 500; color: var(--pill-text);
  background: var(--pill-bg); border-radius: 999px; padding: 0.15rem 0.5rem;
}

table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border-light); }
th { font-size: 0.75rem; font-weight: 600; color: var(--text-3); background: var(--surface-alt); }
tr:last-child td { border-bottom: none; }

/* ── Mobile ────────────────────────────────────────────────────── */
.mobile-agenda { display: none; }

@media (max-width: 600px) {
  .desktop-cal { display: none; }
  .mobile-agenda { display: block; }

  .agenda-empty {
    text-align: center; color: var(--text-muted);
    padding: 2rem 1rem; font-size: 0.9375rem;
  }

  .agenda-row {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 0.875rem 1rem; cursor: pointer;
    border-bottom: 1px solid var(--border-light);
    transition: background 0.12s;
  }
  .agenda-row:last-child { border-bottom: none; }
  .agenda-row:hover { background: var(--surface-alt); }

  .agenda-date {
    display: flex; flex-direction: column; align-items: center;
    min-width: 2.25rem;
  }
  .agenda-day { font-size: 1.25rem; font-weight: 800; line-height: 1; color: var(--text); }
  .agenda-dow { font-size: 0.625rem; font-weight: 600; color: var(--text-3); text-transform: uppercase; }

  .agenda-info { flex: 1; min-width: 0; }
  .agenda-name { display: block; font-weight: 700; font-size: 0.9375rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .agenda-time { font-size: 0.75rem; color: var(--text-3); }

  .agenda-badge {
    font-size: 0.6875rem; font-weight: 600; border-radius: 999px;
    padding: 0.2rem 0.55rem; flex-shrink: 0;
    background: var(--pill-bg); color: var(--pill-text);
  }
  .agenda-row--pending .agenda-badge { background: #fef9c3; color: #854d0e; }
}
</style>
