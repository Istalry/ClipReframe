import { useEffect, type RefObject } from 'react';

/** Beyond this the mix is snapped back to the video clock (seek, tab throttling, decoder stalls). */
const MAX_DRIFT_S = 0.12;

/**
 * Keep a hidden <audio> (the rendered export mix) in lock-step with the <video>: it follows
 * play / pause / seek / rate changes and is re-aligned whenever it drifts.
 */
export function useMixSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  audioRef: RefObject<HTMLAudioElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !active) {
      return;
    }
    const align = (): void => {
      if (Math.abs(audio.currentTime - video.currentTime) > MAX_DRIFT_S) {
        audio.currentTime = video.currentTime;
      }
    };
    const onPlay = (): void => {
      align();
      audio.playbackRate = video.playbackRate;
      void audio.play().catch(() => undefined);
    };
    const onPause = (): void => {
      audio.pause();
      align();
    };
    const onRate = (): void => {
      audio.playbackRate = video.playbackRate;
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', align);
    video.addEventListener('timeupdate', align);
    video.addEventListener('ratechange', onRate);
    if (!video.paused) {
      onPlay();
    }
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', align);
      video.removeEventListener('timeupdate', align);
      video.removeEventListener('ratechange', onRate);
      audio.pause();
    };
  }, [videoRef, audioRef, active]);
}
