<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label>Name *</label>
      <input v-model="form.name" required placeholder="e.g. Bench Press" />
    </div>
    <div class="form-group">
      <label>Muscle Group *</label>
      <select v-model="form.muscleGroup" required>
        <option value="" disabled>Select...</option>
        <option v-for="g in muscleGroups" :key="g" :value="g">{{ capitalize(g) }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Category *</label>
      <select v-model="form.category" required>
        <option value="" disabled>Select...</option>
        <option v-for="c in categories" :key="c" :value="c">{{ capitalize(c) }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea v-model="form.description" rows="3" placeholder="Optional..."></textarea>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Exercise') }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive } from 'vue';

const props = defineProps({ initialData: Object, loading: Boolean, error: String });
const emit  = defineEmits(['submit', 'cancel']);

const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full body', 'cardio'];
const categories   = ['strength', 'hypertrophy', 'endurance', 'cardio', 'flexibility'];

const form = reactive({
  name:        props.initialData?.name        ?? '',
  muscleGroup: props.initialData?.muscleGroup ?? '',
  category:    props.initialData?.category    ?? '',
  description: props.initialData?.description ?? '',
});

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function handleSubmit() {
  emit('submit', { ...form });
}
</script>

<style scoped>
.actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
</style>
