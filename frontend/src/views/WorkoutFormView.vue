<template>
  <div>
    <div class="page-header">
      <button class="btn-back" @click="router.push('/workouts')">← Back</button>
      <h1>{{ isEditing ? 'Edit Workout' : 'Log Workout' }}</h1>
    </div>

    <div v-if="loadError" class="error">{{ loadError }}</div>
    <div v-else-if="loading" class="empty">Loading...</div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="row-2">
        <div class="form-group">
          <label>Workout Name *</label>
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

      <div class="section-header">
        <h2>Exercises</h2>
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
            <select v-model="entry.exercise" required>
              <option value="" disabled>Select exercise...</option>
              <option v-for="ex in allExercises" :key="ex._id" :value="ex._id">
                {{ ex.name }} ({{ ex.muscleGroup }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <input v-model="entry.notes" placeholder="Optional..." />
          </div>
        </div>

        <div class="sets-header">
          <span class="sets-label">Sets</span>
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
        <button type="button" class="btn-secondary" @click="router.push('/workouts')">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Workout') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { workoutsApi, exercisesApi } from '../services/api.js';

const router = useRouter();
const route  = useRoute();

const isEditing  = computed(() => !!route.params.id);
const loading    = ref(false);
const loadError  = ref('');
const saving     = ref(false);
const saveError  = ref('');
const allExercises = ref([]);

const form = reactive({
  name:            '',
  date:            new Date().toISOString().split('T')[0],
  durationMinutes: '',
  notes:           '',
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
      ? await workoutsApi.update(route.params.id, payload)
      : await workoutsApi.create(payload);
    router.push('/workouts');
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
    if (isEditing.value) requests.push(workoutsApi.get(route.params.id));
    const [eRes, wRes] = await Promise.all(requests);
    allExercises.value = eRes.data;

    if (isEditing.value) {
      const w = wRes.data;
      form.name            = w.name;
      form.date            = new Date(w.date).toISOString().split('T')[0];
      form.durationMinutes = w.durationMinutes ?? '';
      form.notes           = w.notes ?? '';
      form.exercises       = w.exercises.map(makeEntry);
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
}
.page-header h1 { font-size: 1.5rem; font-weight: 800; }
.btn-back {
  background: none;
  border: none;
  color: var(--pill-text);
  font-weight: 600;
  padding: 0;
  font-size: 0.9375rem;
  cursor: pointer;
}
.btn-back:hover { opacity: 0.75; }

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
</style>
