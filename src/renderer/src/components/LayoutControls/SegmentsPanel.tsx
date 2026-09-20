import { Scan, Scissors, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  CUT_SENSITIVITIES,
  DEFAULT_CUT_SENSITIVITY,
  type CutSensitivity,
} from '@shared/cuts/detect';
import { segmentRanges } from '@shared/cuts/segments';
import type { LayoutMode } from '@shared/types';

import { useActiveSegment } from '../../hooks/useSegments';
import { formatTime } from '../../lib/format';
import { useJobStore } from '../../store/jobs';
import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';
import { Button } from '../ui/Button';
import { Field, SectionTitle, Select } from '../ui/Field';

const SENSITIVITY_LABELS: Record<CutSensitivity, string> = {
  low: 'Low — only hard cuts',
  medium: 'Medium',
  high: 'High — also soft cuts',
};

const LAYOUT_LABELS: Record<LayoutMode, string> = { split: 'Split', fill: 'Fill' };

/** Cuts inside the clip: detect them, add or remove them, and pick a layout per segment. */
export function SegmentsPanel(): ReactNode {
  const [sensitivity, setSensitivity] = useState<CutSensitivity>(DEFAULT_CUT_SENSITIVITY);
  const { segments, index: activeIndex } = useActiveSegment();
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const addCutAt = useProjectStore((s) => s.addCutAt);
  const removeCut = useProjectStore((s) => s.removeCut);
  const clearCuts = useProjectStore((s) => s.clearCuts);
  const setSegmentLayoutAt = useProjectStore((s) => s.setSegmentLayoutAt);
  const detectJob = useJobStore((s) => s.detectJob);
  const startDetectCuts = useJobStore((s) => s.startDetectCuts);
  const cancelDetectCuts = useJobStore((s) => s.cancelDetectCuts);

  const ranges = segmentRanges(segments, duration);

  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Segments</SectionTitle>
      <Field label="Cut sensitivity">
        <Select
          value={sensitivity}
          options={CUT_SENSITIVITIES.map((s) => ({ value: s, label: SENSITIVITY_LABELS[s] }))}
          onChange={setSensitivity}
          disabled={detectJob !== null}
        />
      </Field>
      <div className="flex items-center gap-2">
        {detectJob ? (
          <>
            <span className="text-muted flex-1 text-xs tabular-nums">
              Detecting cuts… {Math.round(detectJob.fraction * 100)}%
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void cancelDetectCuts();
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              icon={<Scan size={14} />}
              onClick={() => {
                void startDetectCuts(sensitivity);
              }}
            >
              Detect cuts
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Scissors size={14} />}
              title="Split the segment at the playhead (C)"
              onClick={() => {
                addCutAt(currentTime);
              }}
            >
              Add cut
            </Button>
          </>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {ranges.map((range, i) => (
          <li
            key={range.start}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${i === activeIndex ? 'border-accent bg-accent/10' : 'border-border'}`}
          >
            <button
              type="button"
              className="text-muted hover:text-text w-24 shrink-0 text-left tabular-nums"
              title="Go to this segment"
              onClick={() => {
                seek(range.start);
              }}
            >
              {formatTime(range.start)} – {formatTime(range.end)}
            </button>
            <div className="flex flex-1 gap-1">
              {(['split', 'fill'] as const).map((layout) => (
                <button
                  key={layout}
                  type="button"
                  aria-pressed={range.layout === layout}
                  className={`flex-1 rounded border px-1 py-0.5 transition-colors ${range.layout === layout ? 'border-accent bg-accent/15 text-text' : 'border-border text-muted hover:bg-panel-2'}`}
                  onClick={() => {
                    setSegmentLayoutAt(i, layout);
                  }}
                >
                  {LAYOUT_LABELS[layout]}
                </button>
              ))}
            </div>
            {i > 0 && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove the cut at ${formatTime(range.start)}`}
                title="Merge this segment into the previous one"
                icon={<X size={12} />}
                onClick={() => {
                  removeCut(i);
                }}
              />
            )}
          </li>
        ))}
      </ul>
      {segments.length > 1 && (
        <Button size="sm" variant="ghost" onClick={clearCuts}>
          Clear cuts
        </Button>
      )}
    </div>
  );
}
