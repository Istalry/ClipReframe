import { AudioLines, Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';

import { overlayWindow } from '@shared/export/outro';

import { formatTime } from '../../lib/format';
import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';
import { Button } from '../ui/Button';

import { TrimControls } from './TrimControls';

/** Play / pause / mute / scrub for the shared video element. */
export function Transport(): ReactNode {
  const playing = usePlayerStore((s) => s.playing);
  const muted = usePlayerStore((s) => s.muted);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const seek = usePlayerStore((s) => s.seek);
  const mixPath = usePlayerStore((s) => s.mixPath);
  const mixPending = usePlayerStore((s) => s.mixPending);
  const trim = useProjectStore((s) => s.trim);
  const cuts = useProjectStore((s) => s.cuts);
  const outro = useProjectStore((s) => s.settings.outro);
  const outroInfo = useProjectStore((s) => s.outroInfo);
  const overlay =
    outro?.mode === 'overlay' && outroInfo
      ? overlayWindow(duration, outroInfo.duration, trim)
      : null;
  const pct = (t: number): string => `${duration > 0 ? (t / duration) * 100 : 0}%`;

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
      {mixPending ? (
        <span
          className="text-muted flex items-center gap-1 text-xs"
          title="Rendering the export mix"
        >
          <Loader2 size={12} className="animate-spin" /> mix…
        </span>
      ) : (
        mixPath && (
          <span
            className="text-accent flex items-center gap-1 text-xs"
            title="Playing the export audio mix (selected tracks)"
          >
            <AudioLines size={12} /> mix
          </span>
        )
      )}
      <div className="relative flex w-full items-center">
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
        {overlay && (
          // Where the outro is composited over the clip.
          <div
            className="bg-accent/25 pointer-events-none absolute inset-y-0"
            title="Outro on top of the clip"
            style={{ left: pct(overlay.start), width: pct(overlay.end - overlay.start) }}
          />
        )}
        {cuts.map((cut) => (
          // Where the layout changes; the segment list is in the Segments panel.
          <div
            key={cut.time}
            className="bg-accent pointer-events-none absolute inset-y-0 w-px"
            style={{ left: pct(cut.time) }}
          />
        ))}
        {trim && (
          // Shade what the trim leaves out; the bar itself stays fully usable.
          <>
            <div
              className="bg-bg/70 pointer-events-none absolute inset-y-0 left-0 rounded-l"
              style={{ width: pct(trim.start) }}
            />
            <div
              className="bg-bg/70 pointer-events-none absolute inset-y-0 right-0 rounded-r"
              style={{ width: pct(duration - trim.end) }}
            />
          </>
        )}
      </div>
      <span className="text-muted w-24 shrink-0 text-right text-xs tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <TrimControls />
    </div>
  );
}
