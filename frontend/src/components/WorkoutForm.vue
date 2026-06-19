<template>
  <form @submit.prevent="handleSubmit">
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

    <!-- Exercises -->
    <div class="section-header">
      <h3>Exercises</h3>
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
          <div class="ex-filter-row">
            <select v-model="muscleFilters[eIdx]" class="muscle-filter">
              <option value="">All muscles</option>
              <option v-for="g in muscleGroups" :key="g" :value="g">{{ capitalize(g) }}</option>
            </select>
            <select v-model="entry.exercise" required class="ex-select">
              <option value="" disabled>Select exercise...</option>
              <option v-for="ex in filteredExercises(eIdx)" :key="ex._id" :value="ex._id">
                {{ ex.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input v-model="entry.notes" placeholder="Optional..." />
        </div>
      </div>

      <!-- Sets -->
      <div class="sets-header">
        <span class="sets-label">Sets</span>
        <button type="button" class="btn-secondary btn-sm" @click="addSet(eIdx)">+ Set</button>
      </div>
      <div class="sets-grid-head">
        <span>#</span><span>Reps *</span><span>Weight (kg)</span><span>Rest (s)</span><span></span>
      </div>
      <div v-for="(set, sIdx) in entry.sets" :key="sIdx" class="set-row">
        <span class="set-num">{{ set.setNumber }}</span>
        <input type="number" v-model.number="set.reps" min="1" required placeholder="8" />
        <input type="number" v-model.number="set.weightKg" min="0" step="0.5" placeholder="0" />
        <input type="number" v-model.number="set.restSeconds" min="0" placeholder="60" />
        <button
          type="button" class="btn-danger btn-sm"
          :disabled="entry.sets.length === 1"
          @click="removeSet(eIdx, sIdx)"
        >✕</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div class="actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Workout') }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue';

const props = defineProps({
  initialData:        Object,
  availableExercises: { type: Array, default: () => [] },
  loading:            Boolean,
  error:              String,
});
const emit = defineEmits(['submit', 'cancel']);

const muscleGroups  = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const muscleFilters = ref([]);
const capitalize    = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function filteredExercises(eIdx) {
  const g = muscleFilters.value[eIdx];
  if (!g) return props.availableExercises;
  return props.availableExercises.filter(ex => ex.muscleGroup === g);
}

function makeSet(n, prev) {
  return { setNumber: n, reps: prev?.reps ?? '', weightKg: prev?.weightKg ?? 0, restSeconds: prev?.restSeconds ?? 60 };
}

function initEntry(e, idx) {
  return {
    exercise: e?.exercise?._id ?? e?.exercise ?? '',
    order:    e?.order ?? idx + 1,
    notes:    e?.notes ?? '',
    sets:     e?.sets?.map((s, i) => makeSet(i + 1, s)) ?? [makeSet(1)],
  };
}

const form = reactive({
  name:            props.initialData?.name            ?? '',
  date:            props.initialData?.date
    ? new Date(props.initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0],
  durationMinutes: props.initialData?.durationMinutes ?? '',
  notes:           props.initialData?.notes           ?? '',
  exercises:       props.initialData?.exercises?.map(initEntry) ?? [],
});
muscleFilters.value = form.exercises.map(() => '');

function addExercise() {
  form.exercises.push(initEntry(null, form.exercises.length));
  muscleFilters.value.push('');
}
function removeExercise(idx) {
  form.exercises.splice(idx, 1);
  form.exercises.forEach((e, i) => (e.order = i + 1));
  muscleFilters.value.splice(idx, 1);
}
function addSet(eIdx) {
  const sets = form.exercises[eIdx].sets;
  sets.push(makeSet(sets.length + 1, sets[sets.length - 1]));
}
function removeSet(eIdx, sIdx) {
  form.exercises[eIdx].sets.splice(sIdx, 1);
  form.exercises[eIdx].sets.forEach((s, i) => (s.setNumber = i + 1));
}
function handleSubmit() {
  emit('submit', JSON.parse(JSON.stringify(form)));
}
</script>

<style scoped>
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin: 1.5rem 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0;
}
.section-header h3 { font-size: 1rem; font-weight: 700; }
.empty-exercises {
  text-align: center; color: #94a3b8; padding: 2rem;
  border: 2px dashed #e2e8f0; border-radius: 8px; margin-bottom: 1rem;
}
.exercise-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f8fafc; }
.exercise-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.exercise-label { font-weight: 700; font-size: 0.875rem; color: #475569; }
.sets-header { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0 0.375rem; }
.sets-label { font-size: 0.8125rem; font-weight: 600; color: #475569; }
.sets-grid-head {
  display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem; gap: 0.5rem;
  font-size: 0.75rem; font-weight: 600; color: #64748b;
  margin-bottom: 0.375rem; padding: 0 0.125rem;
}
.set-row { display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem; gap: 0.5rem; align-items: center; margin-bottom: 0.375rem; }
.set-num { font-size: 0.8125rem; font-weight: 600; color: #64748b; text-align: center; }
.actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.ex-filter-row { display: flex; flex-direction: column; gap: 0.375rem; }
.muscle-filter { font-size: 0.75rem; color: var(--text-3); }
.ex-select { flex: 1; }
</style>
