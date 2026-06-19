import SOUNDS from 'virtual:sounds';

const audios = SOUNDS.filter(src => !src.includes('achievement')).map(src => {
  const a = new Audio(src);
  a.volume = 0.5;
  return a;
});
let index = 0;

export function playClickSound() {
  if (!audios.length) return;
  try {
    const audio = audios[index];
    audio.currentTime = 0;
   // audio.play();
    index = (index + 1) % audios.length;
  } catch {
    // silently ignore if audio is unavailable
  }
}
