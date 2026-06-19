<template>
  <div>
    <div class="view-header">
      <h1>Exercises</h1>
      <button class="btn-primary" @click="openCreate">+ New Exercise</button>
    </div>

    <input
      v-model="search"
      class="search"
      type="search"
      placeholder="Search exercises..."
    />

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && exercises.length === 0" class="empty">Loading...</div>
    <div v-else-if="exercises.length === 0 && !loading" class="empty">
      No exercises yet. Create one to get started.
    </div>
    <div v-else-if="filtered.length === 0" class="empty">
      No exercises match "{{ search }}".
    </div>

    <div v-else class="list">
      <div v-for="ex in filtered" :key="ex._id" class="card">
        <div class="card-body">
          <h3>{{ ex.name }}</h3>
          <p class="meta">{{ capitalize(ex.muscleGroup) }} · {{ capitalize(ex.category) }}</p>
          <p v-if="ex.description" class="desc">{{ ex.description }}</p>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" @click="openEdit(ex)">Edit</button>
          <button class="btn-danger"    @click="toDelete = ex">Delete</button>
        </div>
      </div>
    </div>

    <BaseModal v-if="showForm" :title="editing ? 'Edit Exercise' : 'New Exercise'" @close="closeForm">
      <ExerciseForm
        :initialData="editing" :loading="saving" :error="saveError"
        @submit="handleSave" @cancel="closeForm"
      />
    </BaseModal>

    <BaseModal v-if="toDelete" title="Delete Exercise" @close="toDelete = null">
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
import { ref, computed, onMounted } from 'vue';
import BaseModal    from '../components/BaseModal.vue';
import ExerciseForm from '../components/ExerciseForm.vue';
import { exercisesApi } from '../services/api.js';

const exercises = ref([]);
const search    = ref('');
const filtered  = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return exercises.value;
  return exercises.value.filter(ex =>
    ex.name.toLowerCase().includes(q) ||
    ex.muscleGroup.toLowerCase().includes(q) ||
    ex.category.toLowerCase().includes(q)
  );
});
const loading   = ref(false);
const loadError = ref('');
const saving    = ref(false);
const saveError = ref('');
const showForm  = ref(false);
const editing   = ref(null);
const toDelete  = ref(null);

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function load() {
  loading.value = true;
  try { exercises.value = (await exercisesApi.list()).data; }
  catch (e) { loadError.value = e.response?.data?.error ?? e.message; }
  finally { loading.value = false; }
}

function openCreate() { editing.value = null; saveError.value = ''; showForm.value = true; }
function openEdit(ex) { editing.value = ex;   saveError.value = ''; showForm.value = true; }
function closeForm()  { showForm.value = false; }

async function handleSave(data) {
  saving.value = true; saveError.value = '';
  try {
    editing.value
      ? await exercisesApi.update(editing.value._id, data)
      : await exercisesApi.create(data);
    closeForm();
    await load();
  } catch (e) {
    saveError.value = e.response?.data?.error ?? e.message;
  } finally { saving.value = false; }
}

async function handleDelete() {
  saving.value = true;
  try {
    await exercisesApi.remove(toDelete.value._id);
    toDelete.value = null;
    await load();
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
    toDelete.value = null;
  } finally { saving.value = false; }
}

onMounted(load);
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.search { margin-bottom: 1.25rem; max-width: 360px; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }
.list { display: grid; gap: 0.75rem; }
.card {
  background: var(--surface); border-radius: 8px; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem;
}
.card-body h3 { font-size: 1rem; font-weight: 700; }
.meta { font-size: 0.8125rem; color: var(--text-3); margin-top: 0.125rem; }
.desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; }
.card-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
</style>
