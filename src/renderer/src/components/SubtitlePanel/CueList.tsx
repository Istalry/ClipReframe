import { Trash2 } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { findActiveCue } from '@shared/subtitles/cues';
import type { SubtitleCue } from '@shared/types';

import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';

interface CueRowProps {
  cue: SubtitleCue;
  active: boolean;
  onSeek: () => void;
  onChange: (patch: Partial<Omit<SubtitleCue, 'id'>>) => void;
  onDelete: () => void;
}

const TIME_STEP = 0.1;

function CueRow({ cue, active, onSeek, onChange, onDelete }: CueRowProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  return (
    <div
      ref={ref}
      className={`group flex items-start gap-1 rounded-md border px-1.5 py-1 ${active ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-panel-2'}`}
    >
      <div className="flex flex-col gap-0.5">
        <input
          type="number"
          aria-label="Start"
          step={TIME_STEP}
          min={0}
          value={cue.start.toFixed(2)}
          onChange={(e) => {
            onChange({ start: Math.max(0, Number(e.target.value)) });
          }}
          className="bg-panel-2 border-border h-6 w-16 rounded border px-1 text-[11px] tabular-nums"
        />
        <input
          type="number"
          aria-label="End"
          step={TIME_STEP}
          min={0}
          value={cue.end.toFixed(2)}
          onChange={(e) => {
            onChange({ end: Math.max(0, Number(e.target.value)) });
          }}
          className="bg-panel-2 border-border h-6 w-16 rounded border px-1 text-[11px] tabular-nums"
        />
      </div>
      <textarea
        aria-label="Subtitle text"
        value={cue.text}
        rows={2}
        onFocus={onSeek}
        onChange={(e) => {
          onChange({ text: e.target.value });
        }}
        className="bg-panel-2 border-border min-w-0 flex-1 resize-none rounded border px-1.5 py-1 text-xs"
      />
      <button
        type="button"
        aria-label="Delete subtitle"
        onClick={onDelete}
        className="text-muted hover:text-danger rounded p-1 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function CueList(): ReactNode {
  const cues = useProjectStore((s) => s.cues);
  const updateCue = useProjectStore((s) => s.updateCue);
  const deleteCue = useProjectStore((s) => s.deleteCue);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);

  if (cues.length === 0) {
    return null;
  }
  const active = findActiveCue(cues, currentTime);

  return (
    <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto pr-1">
      {cues.map((cue) => (
        <CueRow
          key={cue.id}
          cue={cue}
          active={active?.id === cue.id}
          onSeek={() => {
            seek(cue.start);
          }}
          onChange={(patch) => {
            updateCue(cue.id, patch);
          }}
          onDelete={() => {
            deleteCue(cue.id);
          }}
        />
      ))}
    </div>
  );
}
