<template>
  <div>
    <div class="view-header">
      <h1>Sports News</h1>
      <button class="btn-secondary btn-sm" @click="load" :disabled="loading">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-if="loading && items.length === 0" class="empty">Loading news…</div>

    <div v-else class="news-list">
      <a
        v-for="(item, i) in items"
        :key="i"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="news-card"
      >
        <img v-if="item.image" :src="item.image" :alt="item.title" class="news-thumb" />
        <div class="news-content">
          <div class="news-meta">
            <span class="news-source">{{ item.source }}</span>
            <span class="news-date">{{ formatDate(item.pubDate) }}</span>
          </div>
          <h3 class="news-title">{{ item.title }}</h3>
          <p v-if="item.description" class="news-desc">{{ item.description }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../services/api.js';

const items     = ref([]);
const loading   = ref(false);
const loadError = ref('');

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

async function load() {
  loading.value   = true;
  loadError.value = '';
  try {
    items.value = (await newsApi.list()).data;
  } catch (e) {
    loadError.value = e.response?.data?.error ?? e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.view-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.5rem;
}
.view-header h1 { font-size: 1.5rem; font-weight: 800; }
.empty { text-align: center; color: var(--text-muted); padding: 3rem; }

.news-list { display: grid; gap: 0.75rem; }

.news-card {
  display: flex; gap: 1rem; text-decoration: none;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.news-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #7ffc03;
}

.news-thumb {
  width: 120px; min-width: 120px; height: 90px;
  object-fit: cover; flex-shrink: 0;
}

.news-content {
  padding: 0.875rem 1rem 0.875rem 0;
  display: flex; flex-direction: column; justify-content: center;
  min-width: 0;
}
/* shift padding left when no image present */
.news-card:not(:has(.news-thumb)) .news-content { padding-left: 1.25rem; }

.news-meta {
  display: flex; gap: 0.75rem; align-items: center;
  margin-bottom: 0.375rem;
}
.news-source {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--pill-text);
  background: var(--pill-bg); border-radius: 999px;
  padding: 0.15rem 0.55rem;
}
.news-date { font-size: 0.75rem; color: var(--text-3); }

.news-title {
  font-size: 0.9375rem; font-weight: 700;
  color: var(--text); line-height: 1.4;
  margin-bottom: 0.375rem;
}
.news-desc {
  font-size: 0.8125rem; color: var(--text-3);
  line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
</style>
