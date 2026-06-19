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
          <button
            type="button"
            class="picker-trigger"
            :class="{ placeholder: !entry.exercise }"
            @click="openPicker(eIdx)"
          >
            {{ entry.exercise ? exerciseName(entry.exercise) : 'Choose exercise...' }}
            <span class="picker-arrow">▾</span>
          </button>
          <!-- hidden input to satisfy HTML5 required validation -->
          <input type="text" :value="entry.exercise" required style="position:absolute;opacity:0;height:0;width:0;pointer-events:none" tabindex="-1" />
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

  <!-- Exercise picker popup -->
  <Teleport to="body">
    <div v-if="pickerIdx !== null" class="picker-overlay" @click.self="pickerIdx = null">
      <div class="picker-modal">
        <div class="picker-header">
          <h3>Choose Exercise</h3>
          <button type="button" class="picker-close" @click="pickerIdx = null">✕</button>
        </div>

        <div class="picker-filters">
          <input
            v-model="pickerSearch"
            type="search"
            placeholder="Search..."
            class="picker-search"
            autofocus
          />
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
import { reactive, ref, computed } from 'vue';

const props = defineProps({
  initialData:        Object,
  availableExercises: { type: Array, default: () => [] },
  loading:            Boolean,
  error:              String,
});
const emit = defineEmits(['submit', 'cancel']);

const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const capitalize   = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Picker state
const pickerIdx    = ref(null);
const pickerSearch = ref('');
const pickerMuscle = ref('');

const pickerResults = computed(() => {
  let list = props.availableExercises;
  if (pickerMuscle.value) list = list.filter(ex => ex.muscleGroup === pickerMuscle.value);
  const q = pickerSearch.value.trim().toLowerCase();
  if (q) list = list.filter(ex => ex.name.toLowerCase().includes(q));
  return list;
});

function openPicker(eIdx) {
  pickerIdx.value    = eIdx;
  pickerSearch.value = '';
  pickerMuscle.value = '';
}

function pickExercise(ex) {
  form.exercises[pickerIdx.value].exercise = ex._id;
  pickerIdx.value = null;
}

function exerciseName(id) {
  return props.availableExercises.find(ex => ex._id === id)?.name ?? id;
}

// Form
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

function addExercise() { form.exercises.push(initEntry(null, form.exercises.length)); }
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
.exercise-card { border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: var(--surface-alt); }
.exercise-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.exercise-label { font-weight: 700; font-size: 0.875rem; color: var(--text-2); }
.sets-header { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0 0.375rem; }
.sets-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-2); }
.sets-grid-head {
  display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem; gap: 0.5rem;
  font-size: 0.75rem; font-weight: 600; color: var(--text-3);
  margin-bottom: 0.375rem; padding: 0 0.125rem;
}
.set-row { display: grid; grid-template-columns: 2rem 1fr 1fr 1fr 2.5rem; gap: 0.5rem; align-items: center; margin-bottom: 0.375rem; }
.set-num { font-size: 0.8125rem; font-weight: 600; color: var(--text-3); text-align: center; }
.actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

/* Picker trigger button */
.picker-trigger {
  width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center;
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--text); cursor: pointer;
  transition: border-color 0.15s;
}
.picker-trigger:hover { border-color: #7ffc03; }
.picker-trigger.placeholder { color: var(--text-muted); }
.picker-arrow { color: var(--text-3); font-size: 0.75rem; }

/* Picker overlay */
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
.picker-item.selected { background: #f0fff0; color: #1a5c00; }
.picker-item-name { font-size: 0.875rem; font-weight: 500; }
.picker-item-meta { font-size: 0.75rem; color: var(--text-3); flex-shrink: 0; }
</style>
