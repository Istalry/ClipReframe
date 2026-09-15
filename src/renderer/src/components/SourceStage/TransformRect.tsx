import type { ReactNode } from 'react';

import type { RegionKind, ResizeHandle } from '@shared/geometry/layout';
import type { Rect } from '@shared/types';

import { useDragResize } from '../../hooks/useDragResize';

interface TransformRectProps {
  kind: RegionKind;
  rect: Rect;
  normalizedAspect: number;
  selected: boolean;
  getStageSize: () => { width: number; height: number };
  onChange: (rect: Rect) => void;
  onSelect: () => void;
}

const HANDLES: { handle: ResizeHandle; className: string }[] = [
  { handle: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
  { handle: 'n', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
  { handle: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
  { handle: 'e', className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  {
    handle: 'se',
    className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  },
  { handle: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
  {
    handle: 'sw',
    className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  },
  { handle: 'w', className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
];

const COLOR: Record<RegionKind, string> = {
  webcam: 'var(--color-webcam)',
  gameplay: 'var(--color-gameplay)',
};

const LABEL: Record<RegionKind, string> = { webcam: 'Webcam', gameplay: 'Gameplay' };

export function TransformRect({
  kind,
  rect,
  normalizedAspect,
  selected,
  getStageSize,
  onChange,
  onSelect,
}: TransformRectProps): ReactNode {
  const { onMovePointerDown, onHandlePointerDown } = useDragResize({
    rect,
    normalizedAspect,
    getStageSize,
    onChange,
    onStart: onSelect,
  });
  const color = COLOR[kind];

  return (
    <div
      data-testid={`rect-${kind}`}
      className="absolute cursor-move touch-none"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        outline: `${selected ? 2 : 1.5}px solid ${color}`,
        outlineOffset: -1,
        boxShadow: selected ? `0 0 0 1px ${color}55, 0 0 12px ${color}66` : 'none',
        zIndex: selected ? 2 : 1,
      }}
      onPointerDown={onMovePointerDown}
    >
      <span
        className="absolute -top-5 left-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-black"
        style={{ background: color }}
      >
        {LABEL[kind]}
      </span>
      {/* Rule-of-thirds guide while selected */}
      {selected && (
        <>
          <span className="absolute top-0 bottom-0 left-1/3 w-px bg-white/25" />
          <span className="absolute top-0 bottom-0 left-2/3 w-px bg-white/25" />
          <span className="absolute top-1/3 right-0 left-0 h-px bg-white/25" />
          <span className="absolute top-2/3 right-0 left-0 h-px bg-white/25" />
        </>
      )}
      {HANDLES.map(({ handle, className }) => (
        <span
          key={handle}
          data-testid={`handle-${kind}-${handle}`}
          className={`absolute h-2.5 w-2.5 rounded-sm border border-black/60 bg-white ${className}`}
          style={{ opacity: selected ? 1 : 0.6 }}
          onPointerDown={(e) => {
            onHandlePointerDown(handle, e);
          }}
        />
      ))}
    </div>
  );
}
