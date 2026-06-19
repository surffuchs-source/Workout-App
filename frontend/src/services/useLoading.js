import { ref } from 'vue';

export const isLoading = ref(false);

let active    = 0;
let loadStart = 0;
let hideTimer = null;

export function startLoading() {
  if (active === 0) {
    clearTimeout(hideTimer);
    loadStart        = Date.now();
    isLoading.value  = true;
  }
  active++;
}

export function stopLoading() {
  active = Math.max(0, active - 1);
  if (active === 0) {
    const elapsed   = Date.now() - loadStart;
    const remaining = Math.max(0, 1000 - elapsed);
    hideTimer = setTimeout(() => { isLoading.value = false; }, remaining);
  }
}
