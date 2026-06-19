import { ref } from 'vue';
import { achievementsApi } from './api.js';

export const toastQueue = ref([]);

export async function checkAchievements() {
  try {
    const { data } = await achievementsApi.check();
    toastQueue.value.push(...data);
  } catch {
    // silently ignore — achievements are non-critical
  }
}

export function dismissToast() {
  toastQueue.value.shift();
}
