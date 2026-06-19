<template>
  <div>
    <div class="view-header">
      <h1>Achievements</h1>
      <span class="progress-label">{{ earnedCount }} / {{ all.length }} unlocked</span>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading" class="empty">Loading...</div>

    <div v-else class="grid">
      <div
        v-for="a in all"
        :key="a.id"
        class="card"
        :class="{ 'card--earned': a.earned, 'card--locked': !a.earned }"
      >
        <div class="card-icon">{{ a.earned ? a.icon : '🔒' }}</div>
        <div class="card-body">
          <span class="card-name">{{ a.name }}</span>
          <span class="card-desc">{{ a.description }}</span>
          <span v-if="a.earned" class="card-date">{{ formatDate(a.earnedAt) }}</span>
          <div v-if="!a.earned && a.progress" class="card-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: Math.round((a.progress.current / a.progress.target) * 100) + '%' }"
              />
            </div>
            <span class="progress-text">{{ a.progress.current }} / {{ a.progress.target }} {{ a.progress.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { achievementsApi } from '../services/api.js';

const all       = ref([]);
const loading   = ref(false);
const loadError = ref('');

const earnedCount = computed(() => all.value.filter(a => a.earned).length);

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

onMounted(async () => {
  loading.value = true;
  try {
    all.value = (await achievementsApi.list()).data;
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.progress-label { font-size: 0.875rem; color: var(--text-3); font-weight: 600; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.875rem;
}

.card {
  border-radius: 12px; border: 1px solid var(--border);
  padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start;
  transition: box-shadow 0.15s;
}
.card--earned {
  background: var(--surface);
}
.card--earned:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.card--locked {
  background: var(--surface-alt);
  opacity: 0.75;
}

.card-icon { font-size: 2rem; line-height: 1; flex-shrink: 0; }
.card-body { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; width: 100%; }
.card-name { font-size: 0.9375rem; font-weight: 700; color: var(--text); }
.card-desc { font-size: 0.8125rem; color: var(--text-3); line-height: 1.4; }
.card-date { font-size: 0.75rem; color: var(--pill-text); font-weight: 600; margin-top: 0.25rem; }

.card-progress { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
.progress-bar {
  height: 6px; border-radius: 999px;
  background: var(--border); overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: 999px;
  background: #7ffc03;
  transition: width 0.4s ease;
  min-width: 4px;
}
.progress-text { font-size: 0.6875rem; font-weight: 600; color: var(--text-3); }

@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
