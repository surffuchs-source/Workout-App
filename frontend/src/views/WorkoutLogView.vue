<template>
  <div>
    <div class="page-header">
      <button class="btn-back" @click="router.push('/logs')">← Back</button>
      <h1>{{ isEditing ? 'Edit Log' : 'Log Session' }}</h1>
      <span v-if="planName" class="plan-ref">from plan: {{ planName }}</span>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>
    <div v-else-if="loading" class="empty">Loading...</div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="row-2">
        <div class="form-group">
          <label>Session Name *</label>
          <input v-model="form.name" required placeholder="e.g. Push Day A" />
        </div>
        <div class="form-group">
          <label>Date *</label>
          <input type="date" v-model="form.date" required />
        </div>
      </div>
      <div class="row-2">
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" v-model.number="form.durationMinutes" min="1" placeholder="60" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input v-model="form.notes" placeholder="Optional..." />
        </div>
      </div>
      <div class="row-2">
        <div class="form-group">
          <label>Start time</label>
          <input type="time" v-model="form.startTime" />
        </div>
        <div class="form-group">
          <label>End time</label>
          <input type="time" v-model="form.endTime" />
        </div>
      </div>
      <div class="done-row">
        <label class="done-label">
          <input type="checkbox" v-model="form.done" />
          Mark as done
        </label>
      </div>

      <div class="section-header">
        <h2>Exercises &amp; Actual Sets</h2>
        <button type="button" class="btn-primary btn-sm" @click="addExercise">+ Add Exercise</button>
      </div>

      <div v-if="form.exercises.length === 0" class="empty-exercises">
        No exercises added yet. Click "Add Exercise" to begin.
      </div>

      <div v-for="(entry, eIdx) in form.exercises" :key="eIdx" class="exercise-card">
        <div class="exercise-card-header">
          <span class="exercise-label">Exercise {{ eIdx + 1 }}</span>
          <button type="button" class="btn-danger btn-sm" @click="removeExercise(eIdx)">Remove</button>
        </div>

        <div class="row-2">
          <div class="form-group">
            <label>Exercise *</label>
            <button
              type="button"
              class="picker-trigger"
              :class="{ placeholder: !entry.exercise }"
              @click="openPicker(eIdx)"
            >
              {{ entry.exercise ? exerciseName(entry.exercise) : 'Choose exercise...' }}
              <span class="picker-arrow">▾</span>
            </button>
            <input type="text" :value="entry.exercise" required style="position:absolute;opacity:0;height:0;width:0;pointer-events:none" tabindex="-1" />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <input v-model="entry.notes" placeholder="Optional..." />
          </div>
        </div>

        <div class="sets-header">
          <span class="sets-label">Sets (actual)</span>
          <button type="button" class="btn-secondary btn-sm" @click="addSet(eIdx)">+ Set</button>
        </div>
        <div class="sets-grid-head">
          <span>#</span>
          <span v-if="isCardio(entry.exercise)">Duration (s)</span>
          <span v-else>Reps *</span>
          <span v-if="isCardio(entry.exercise)">Distance (km)</span>
          <span v-else>Weight (kg)</span>
          <span>Rest (s)</span><span></span>
        </div>
        <div v-for="(set, sIdx) in entry.sets" :key="sIdx" class="set-row">
          <span class="set-num">{{ set.setNumber }}</span>
          <template v-if="isCardio(entry.exercise)">
            <div class="duration-hms">
              <input type="number" v-model.number="set.durationH" min="0" placeholder="0" /><span class="hms-sep">h</span>
              <input type="number" v-model.number="set.durationM" min="0" max="59" placeholder="0" /><span class="hms-sep">m</span>
              <input type="number" v-model.number="set.durationS" min="0" max="59" placeholder="0" /><span class="hms-sep">s</span>
            </div>
            <input type="number" v-model.number="set.distanceKm" min="0" step="0.01" placeholder="1.0" />
          </template>
          <template v-else>
            <input type="number" v-model.number="set.reps" min="1" required placeholder="8" />
            <input type="number" v-model.number="set.weightKg" min="0" step="0.5" placeholder="0" />
          </template>
          <input type="number" v-model.number="set.restSeconds" min="0" placeholder="60" />
          <button
            type="button" class="btn-danger btn-sm"
            :disabled="entry.sets.length === 1"
            @click="removeSet(eIdx, sIdx)"
          >✕</button>
        </div>
      </div>

      <p v-if="saveError" class="error">{{ saveError }}</p>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="router.push('/logs')">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Log') }}
        </button>
      </div>
    </form>
  </div>

  <Teleport to="body">
    <div v-if="pickerIdx !== null" class="picker-overlay" @click.self="pickerIdx = null">
      <div class="picker-modal">
        <div class="picker-header">
          <h3>Choose Exercise</h3>
          <button type="button" class="picker-close" @click="pickerIdx = null">✕</button>
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
          <button
            v-for="ex in pickerResults" :key="ex._id"
            type="button"
            class="picker-item"
            :class="{ selected: form.exercises[pickerIdx]?.exercise === ex._id }"
            @click="pickExercise(ex)"
          >
            <span class="picker-item-name">{{ ex.name }}</span>
            <span class="picker-item-meta">{{ capitalize(ex.muscleGroup) }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

const muscleGroups  = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const capitalize    = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pickerIdx     = ref(null);
const pickerSearch  = ref('');
const pickerMuscle  = ref('');
const pickerResults = computed(() => {
  let list = allExercises.value;
  if (pickerMuscle.value) list = list.filter(ex => ex.muscleGroup === pickerMuscle.value);
  const q = pickerSearch.value.trim().toLowerCase();
  if (q) list = list.filter(ex => ex.name.toLowerCase().includes(q));
  return list;
});
function openPicker(eIdx) { pickerIdx.value = eIdx; pickerSearch.value = ''; pickerMuscle.value = ''; }
function pickExercise(ex) { form.exercises[pickerIdx.value].exercise = ex._id; pickerIdx.value = null; }
function exerciseName(id) { return allExercises.value.find(ex => ex._id === id)?.name ?? id; }
import { useRouter, useRoute } from 'vue-router';
import { workoutLogsApi, workoutsApi, exercisesApi } from '../services/api.js';
import { checkAchievements } from '../services/useAchievements.js';

const router = useRouter();
const route  = useRoute();

const isEditing    = computed(() => !!route.params.id);
const loading      = ref(false);
const loadError    = ref('');
const saving       = ref(false);
const saveError    = ref('');
const allExercises = ref([]);
const planName     = ref('');

const form = reactive({
  workout:         null,
  name:            '',
  date:            new Date().toISOString().split('T')[0],
  durationMinutes: '',
  notes:           '',
  startTime:       '',
  endTime:         '',
  done:            false,
  exercises:       [],
});

function secsToHms(s) {
  const total = s || 0;
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

function makeSet(n, prev) {
  const hms = secsToHms(prev?.durationSeconds);
  return {
    setNumber:   n,
    reps:        prev?.reps ?? '',
    weightKg:    prev?.weightKg ?? 0,
    durationH:   hms.h,
    durationM:   hms.m,
    durationS:   hms.s,
    distanceKm:  prev?.distanceKm ?? '',
    restSeconds: prev?.restSeconds ?? 60,
  };
}

function isCardio(exerciseId) {
  if (!exerciseId) return false;
  const ex = allExercises.value.find(e => e._id === exerciseId);
  return ex?.muscleGroup === 'cardio' || ex?.category === 'cardio';
}

function makeEntry(e, idx) {
  return {
    exercise: e?.exercise?._id ?? e?.exercise ?? '',
    order:    e?.order ?? idx + 1,
    notes:    e?.notes ?? '',
    sets:     e?.sets?.map((s, i) => makeSet(i + 1, s)) ?? [makeSet(1)],
  };
}

function addExercise() {
  form.exercises.push(makeEntry(null, form.exercises.length));
}

function removeExercise(idx) {
  form.exercises.splice(idx, 1);
  form.exercises.forEach((e, i) => (e.order = i + 1));
}

function addSet(eIdx) {
  const sets = form.exercises[eIdx].sets;
  sets.push(makeSet(sets.length + 1, sets[sets.length - 1]));
}

function removeSet(eIdx, sIdx) {
  form.exercises[eIdx].sets.splice(sIdx, 1);
  form.exercises[eIdx].sets.forEach((s, i) => (s.setNumber = i + 1));
}

async function handleSubmit() {
  saving.value = true;
  saveError.value = '';
  try {
    const payload = JSON.parse(JSON.stringify(form));
    payload.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        set.durationSeconds = (set.durationH || 0) * 3600 + (set.durationM || 0) * 60 + (set.durationS || 0);
        delete set.durationH; delete set.durationM; delete set.durationS;
      });
    });
    isEditing.value
      ? await workoutLogsApi.update(route.params.id, payload)
      : await workoutLogsApi.create(payload);
    await checkAchievements();
    router.push('/logs');
  } catch (e) {
    saveError.value = e.response?.data?.error ?? e.message;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const requests = [exercisesApi.list()];
    if (isEditing.value) requests.push(workoutLogsApi.get(route.params.id));
    else if (route.query.planId) requests.push(workoutsApi.get(route.query.planId));

    const [eRes, secondRes] = await Promise.all(requests);
    allExercises.value = eRes.data;

    if (isEditing.value && secondRes) {
      const log = secondRes.data;
      form.workout         = log.workout?._id ?? log.workout ?? null;
      form.name            = log.name;
      form.date            = new Date(log.date).toISOString().split('T')[0];
      form.durationMinutes = log.durationMinutes ?? '';
      form.notes           = log.notes ?? '';
      form.startTime       = log.startTime ?? '';
      form.endTime         = log.endTime ?? '';
      form.done            = log.done ?? false;
      form.exercises       = log.exercises.map(makeEntry);
      if (log.workout) planName.value = log.workout.name;
    } else if (route.query.planId && secondRes) {
      const plan = secondRes.data;
      form.workout   = plan._id;
      form.name      = plan.name;
      form.exercises = plan.exercises.map(makeEntry);
      planName.value = plan.name;
    }
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}
.page-header h1 { font-size: 1.5rem; font-weight: 800; }
.btn-back {
  background: none; border: none; color: var(--pill-text);
  font-weight: 600; padding: 0; font-size: 0.9375rem; cursor: pointer;
}
.btn-back:hover { opacity: 0.75; }
.plan-ref {
  font-size: 0.8125rem; color: var(--text-3);
  border: 1px solid var(--border); border-radius: 999px;
  padding: 0.2rem 0.75rem; background: var(--surface-alt);
}

.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin: 1.75rem 0 0.875rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border);
}
.section-header h2 { font-size: 1.125rem; font-weight: 700; }

.empty-exercises {
  text-align: center; color: var(--text-muted); padding: 2rem;
  border: 2px dashed var(--border); border-radius: 8px; margin-bottom: 1rem;
}
.exercise-card {
  border: 1px solid var(--border); border-radius: 10px;
  padding: 1.25rem; margin-bottom: 1rem; background: var(--surface);
}
.exercise-card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.875rem;
}
.exercise-label { font-weight: 700; font-size: 0.875rem; color: var(--text-2); }

.sets-header { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0 0.375rem; }
.sets-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-2); }
.sets-grid-head {
  display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem; gap: 0.5rem;
  font-size: 0.75rem; font-weight: 600; color: var(--text-3);
  margin-bottom: 0.375rem; padding: 0 0.125rem;
}
.set-row {
  display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem;
  gap: 0.5rem; align-items: center; margin-bottom: 0.375rem;
}
.set-num { font-size: 0.8125rem; font-weight: 600; color: var(--text-3); text-align: center; }

.duration-hms {
  display: flex; align-items: center; gap: 0.2rem;
}
.duration-hms input { width: 3rem; padding: 0.5rem 0.25rem; text-align: center; }
.hms-sep { font-size: 0.75rem; font-weight: 600; color: var(--text-3); }

.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }
.done-row { margin-bottom: 1rem; }
.done-label {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.875rem; font-weight: 600; color: var(--text-2); cursor: pointer;
}
.done-label input[type="checkbox"] { width: 1rem; height: 1rem; cursor: pointer; }

.picker-trigger {
  width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center;
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--text); cursor: pointer;
  transition: border-color 0.15s;
}
.picker-trigger:hover { border-color: #7ffc03; }
.picker-trigger.placeholder { color: var(--text-muted); }
.picker-arrow { color: var(--text-3); font-size: 0.75rem; }
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
</style>
