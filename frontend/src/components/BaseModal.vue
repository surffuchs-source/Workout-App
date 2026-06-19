<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ title: String });
defineEmits(['close']);
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 1rem;
}
.modal {
  background: var(--surface); border-radius: 10px;
  width: 100%; max-width: 700px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.modal-header h2 { font-size: 1.125rem; font-weight: 700; }
.close-btn { background: none; border: none; font-size: 1rem; color: var(--text-3); padding: 0.25rem; cursor: pointer; }
.modal-body { padding: 1.5rem; overflow-y: auto; }
</style>
