import { Rows2, Square } from 'lucide-react';
import type { ReactNode } from 'react';

import { SPLIT_RATIO_MAX, SPLIT_RATIO_MIN } from '@shared/constants';
import type { LayoutMode } from '@shared/types';

import { useProjectStore } from '../../store/project';
import { Field, SectionTitle, Slider } from '../ui/Field';

const LAYOUTS: { value: LayoutMode; label: string; icon: ReactNode; hint: string }[] = [
  {
    value: 'split',
    label: 'Split',
    icon: <Rows2 size={18} />,
    hint: 'Webcam on top, gameplay below',
  },
  {
    value: 'fill',
    label: 'Fill',
    icon: <Square size={18} />,
    hint: 'One 9:16 crop of the gameplay',
  },
];

export function LayoutPanel(): ReactNode {
  const layout = useProjectStore((s) => s.settings.layout);
  const splitRatio = useProjectStore((s) => s.settings.splitRatio);
  const setLayout = useProjectStore((s) => s.setLayout);
  const setSplitRatio = useProjectStore((s) => s.setSplitRatio);

  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Layout</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            type="button"
            title={l.hint}
            aria-pressed={layout === l.value}
            onClick={() => {
              setLayout(l.value);
            }}
            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-xs transition-colors ${layout === l.value ? 'border-accent bg-accent/15 text-text' : 'border-border text-muted hover:bg-panel-2'}`}
          >
            {l.icon}
            {l.label}
          </button>
        ))}
      </div>
      {layout === 'split' && (
        <Field label="Webcam height" hint="Drag the line in the preview, or use the slider.">
          <Slider
            value={splitRatio}
            min={SPLIT_RATIO_MIN}
            max={SPLIT_RATIO_MAX}
            step={0.01}
            onChange={setSplitRatio}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </Field>
      )}
      <p className="text-muted text-[11px]">
        <span className="text-webcam">■</span> Webcam &nbsp;
        <span className="text-gameplay">■</span> Gameplay — drag to move, handles to resize.
      </p>
    </div>
  );
}
