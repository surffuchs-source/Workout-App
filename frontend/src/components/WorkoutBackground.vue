<template>
  <div class="workout-bg" aria-hidden="true">
    <img src="/workout.gif" class="figure" alt="" />
  </div>
</template>

<script setup></script>

<style scoped>
.workout-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.figure {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.07;
}
</style>
