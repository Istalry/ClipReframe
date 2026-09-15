import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatTime } from '../../lib/format';
import { usePlayerStore } from '../../store/player';
import { Button } from '../ui/Button';

/** Play / pause / mute / scrub for the shared video element. */
export function Transport(): ReactNode {
  const playing = usePlayerStore((s) => s.playing);
  const muted = usePlayerStore((s) => s.muted);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const seek = usePlayerStore((s) => s.seek);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
        icon={playing ? <Pause size={16} /> : <Play size={16} />}
      />
      <Button
        variant="ghost"
        size="sm"
        aria-label={muted ? 'Unmute' : 'Mute'}
        onClick={toggleMute}
        icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      />
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => {
          seek(Number(e.target.value));
        }}
        className="w-full"
      />
      <span className="text-muted w-24 shrink-0 text-right text-xs tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
