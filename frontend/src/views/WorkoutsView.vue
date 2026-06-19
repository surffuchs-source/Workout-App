<template>
  <div>
    <div class="view-header">
      <h1>Workouts</h1>
      <button class="btn-primary" @click="router.push('/workouts/new')">+ New Workout</button>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && workouts.length === 0" class="empty">Loading...</div>
    <div v-else-if="workouts.length === 0 && !loading" class="empty">
      No workouts yet. Log your first session!
    </div>

    <div v-else class="list">
      <div v-for="w in workouts" :key="w._id" class="workout-card">
        <div class="workout-info">
          <div class="workout-top">
            <h3>{{ w.name }}</h3>
            <span class="date">{{ formatDate(w.date) }}</span>
          </div>
          <div class="workout-stats">
            <span v-if="w.durationMinutes">{{ w.durationMinutes }} min</span>
            <span>{{ w.exercises.length }} exercise{{ w.exercises.length !== 1 ? 's' : '' }}</span>
            <span>{{ totalSets(w) }} sets</span>
          </div>
          <div class="pills">
            <span v-for="entry in w.exercises.slice(0, 4)" :key="entry.exercise?._id" class="pill">
              {{ entry.exercise?.name ?? 'Unknown' }}
            </span>
            <span v-if="w.exercises.length > 4" class="pill pill-more">+{{ w.exercises.length - 4 }} more</span>
          </div>
          <p v-if="w.notes" class="notes">{{ w.notes }}</p>
        </div>
        <div class="workout-actions">
          <button class="btn-success"   @click="router.push(`/logs/new?planId=${w._id}`)">Log Session</button>
          <button class="btn-secondary" @click="router.push(`/workouts/${w._id}/edit`)">Edit</button>
          <button class="btn-danger"    @click="toDelete = w">Delete</button>
        </div>
      </div>
    </div>

    <BaseModal v-if="toDelete" title="Delete Workout" @close="toDelete = null">
      <p>Delete <strong>{{ toDelete.name }}</strong>? This cannot be undone.</p>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseModal  from '../components/BaseModal.vue';
import { workoutsApi } from '../services/api.js';

const router   = useRouter();
const workouts = ref([]);
const loading  = ref(false);
const loadError = ref('');
const saving   = ref(false);
const toDelete = ref(null);

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const totalSets = (w) => w.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0);

async function loadAll() {
  loading.value = true;
  try {
    workouts.value = (await workoutsApi.list()).data;
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally { loading.value = false; }
}

async function handleDelete() {
  saving.value = true;
  try {
    await workoutsApi.remove(toDelete.value._id);
    toDelete.value = null;
    await loadAll();
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
    toDelete.value = null;
  } finally { saving.value = false; }
}

onMounted(loadAll);
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }
.list { display: grid; gap: 0.75rem; }
.workout-card {
  background: var(--surface); border-radius: 10px; border: 1px solid var(--border); padding: 1.25rem;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
}
.workout-info { flex: 1; min-width: 0; }
.workout-top { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.375rem; }
.workout-top h3 { font-size: 1rem; font-weight: 700; }
.date { font-size: 0.8125rem; color: var(--text-3); }
.workout-stats { display: flex; gap: 1rem; font-size: 0.8125rem; color: var(--text-3); margin-bottom: 0.625rem; }
.pills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pill { background: var(--pill-bg); color: var(--pill-text); border-radius: 999px; font-size: 0.75rem; padding: 0.2rem 0.6rem; font-weight: 500; }
.pill-more { background: var(--surface-alt); color: var(--text-3); }
.notes { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic; }
.workout-actions { display: flex; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }

@media (max-width: 600px) {
  .workout-card { flex-direction: column; }
  .workout-actions { width: 100%; justify-content: stretch; margin-top: 0.75rem; }
  .workout-actions button { flex: 1; }
}
</style>
