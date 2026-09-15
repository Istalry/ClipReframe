import { useEffect } from 'react';

import { usePlayerStore } from '../store/player';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

/** Space = play/pause, ←/→ = ±1 s (Shift = ±5 s), M = mute. Ignored while typing in a field. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTyping(e.target)) {
        return;
      }
      const player = usePlayerStore.getState();
      if (!player.element) {
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.seek(player.currentTime - (e.shiftKey ? 5 : 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.seek(player.currentTime + (e.shiftKey ? 5 : 1));
          break;
        case 'm':
        case 'M':
          player.toggleMute();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
