/** `83.4` → `1:23.4` */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
}

/** `my clip.mp4` → `my clip_vertical.mp4` */
export function defaultOutputName(fileName: string): string {
  return `${fileName.replace(/\.[^.]+$/, '')}_vertical.mp4`;
}
