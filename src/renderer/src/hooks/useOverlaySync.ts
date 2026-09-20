import { useEffect, type RefObject } from 'react';

/** Beyond this the outro is snapped back to the video clock (seek, throttling, decoder stalls). */
const MAX_DRIFT_S = 0.12;

/**
 * Keep the hidden outro <video> in lock-step with the clip: it holds its first frame until the
 * playhead reaches `start`, then plays `currentTime - start` alongside it.
 */
export function useOverlaySync(
  videoRef: RefObject<HTMLVideoElement | null>,
  overlayRef: RefObject<HTMLVideoElement | null>,
  start: number,
  active: boolean,
): void {
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || !active) {
      return;
    }
    const align = (): void => {
      const target = video.currentTime - start;
      if (target < 0) {
        if (!overlay.paused) {
          overlay.pause();
        }
        if (overlay.currentTime !== 0) {
          overlay.currentTime = 0;
        }
        return;
      }
      if (Math.abs(overlay.currentTime - target) > MAX_DRIFT_S) {
        overlay.currentTime = Math.min(target, overlay.duration || target);
      }
      if (!video.paused && overlay.paused) {
        void overlay.play().catch(() => undefined);
      }
    };
    const onPlay = (): void => {
      overlay.playbackRate = video.playbackRate;
      align();
    };
    const onPause = (): void => {
      overlay.pause();
      align();
    };
    const onRate = (): void => {
      overlay.playbackRate = video.playbackRate;
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', align);
    video.addEventListener('timeupdate', align);
    video.addEventListener('ratechange', onRate);
    align();
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', align);
      video.removeEventListener('timeupdate', align);
      video.removeEventListener('ratechange', onRate);
      overlay.pause();
    };
  }, [videoRef, overlayRef, start, active]);
}
