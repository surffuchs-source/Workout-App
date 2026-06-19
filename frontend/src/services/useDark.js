import { ref } from 'vue';

export const isDark = ref(false);

export function initDark() {
  isDark.value = localStorage.getItem('dark') === '1';
  document.documentElement.classList.toggle('dark', isDark.value);
}

export function toggleDark() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('dark', isDark.value ? '1' : '0');
}
