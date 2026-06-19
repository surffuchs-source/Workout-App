<template>
  <Transition name="toast">
    <div v-if="current" class="achievement-toast" @click="dismiss">
      <div class="toast-icon">{{ current.icon }}</div>
      <div class="toast-body">
        <span class="toast-label">Achievement Unlocked!</span>
        <span class="toast-name">{{ current.name }}</span>
        <span class="toast-desc">{{ current.description }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { toastQueue, dismissToast } from '../services/useAchievements.js';

const current = computed(() => toastQueue.value[0] ?? null);
let autoTimer = null;

const achievementAudio = new Audio('/achievement.mp3');
achievementAudio.volume = 0.7;

function dismiss() {
  clearTimeout(autoTimer);
  dismissToast();
}

watch(current, (val) => {
  clearTimeout(autoTimer);
  if (val) {
    achievementAudio.currentTime = 0;
    achievementAudio.play().catch(() => {});
    autoTimer = setTimeout(dismiss, 4500);
  }
});
</script>

<style scoped>
.achievement-toast {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
  display: flex; align-items: center; gap: 1rem;
  background: #7ffc03; color: #111827;
  border-radius: 12px; padding: 1rem 1.25rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  cursor: pointer; max-width: 320px;
  border: 2px solid rgba(0,0,0,0.08);
}
.toast-icon { font-size: 2rem; flex-shrink: 0; line-height: 1; }
.toast-body { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
.toast-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.65; }
.toast-name  { font-size: 1rem; font-weight: 800; }
.toast-desc  { font-size: 0.8125rem; opacity: 0.75; }

.toast-enter-active { transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s; }
.toast-leave-active { transition: transform 0.25s ease-in, opacity 0.2s; }
.toast-enter-from   { transform: translateY(120%); opacity: 0; }
.toast-leave-to     { transform: translateX(110%); opacity: 0; }
</style>
