<template>
  <Transition name="fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="pulse-ring" />
      <div class="pulse-circle" />
    </div>
  </Transition>
</template>

<script setup>
import { isLoading } from '../services/useLoading.js';
</script>

<style scoped>
.loading-overlay {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(2px);
}

.pulse-circle {
  width: 64px; height: 64px; border-radius: 50%;
  background: #7ffc03;
  animation: pulse 1.2s ease-in-out infinite;
}

.pulse-ring {
  position: absolute;
  width: 64px; height: 64px; border-radius: 50%;
  background: #7ffc03;
  animation: ring 1.2s ease-in-out infinite;
  opacity: 0;
}

@keyframes pulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.25); opacity: 0.85; }
}

@keyframes ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
