import type { ReactNode } from 'react';

import type { ProjectSettings } from '@shared/types';

interface PresetThumbnailProps {
  settings: ProjectSettings;
}

const W = 64;
const H = 36;

/** Tiny schematic of the source frame with the crop rectangles, so presets are recognisable at a glance. */
export function PresetThumbnail({ settings }: PresetThumbnailProps): ReactNode {
  const { layout, webcamRect, gameplayRect } = settings;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 rounded-sm bg-black">
      <rect x={0} y={0} width={W} height={H} fill="#111" />
      <rect
        x={gameplayRect.x * W}
        y={gameplayRect.y * H}
        width={gameplayRect.width * W}
        height={gameplayRect.height * H}
        fill="var(--color-gameplay)"
        fillOpacity={0.25}
        stroke="var(--color-gameplay)"
        strokeWidth={1}
      />
      {layout === 'split' && (
        <rect
          x={webcamRect.x * W}
          y={webcamRect.y * H}
          width={webcamRect.width * W}
          height={webcamRect.height * H}
          fill="var(--color-webcam)"
          fillOpacity={0.25}
          stroke="var(--color-webcam)"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
