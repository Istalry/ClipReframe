import { useCallback, useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { moveRect, resizeRect } from '@shared/geometry/layout';
import type { ResizeHandle } from '@shared/geometry/layout';
import type { Rect } from '@shared/types';

export interface DragResizeOptions {
  rect: Rect;
  /** Normalised aspect (width / height in 0..1 units) the rect must keep. */
  normalizedAspect: number;
  /** Size in CSS pixels of the element the rect is normalised against. */
  getStageSize: () => { width: number; height: number };
  onChange: (rect: Rect) => void;
  onStart?: () => void;
}

export interface DragResizeHandlers {
  onMovePointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (handle: ResizeHandle, e: ReactPointerEvent) => void;
}

/**
 * Pointer-driven move/resize of a normalised rect. Uses pointer capture so drags continue when the
 * cursor leaves the element; all maths delegate to the pure geometry module.
 */
export function useDragResize(options: DragResizeOptions): DragResizeHandlers {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  const begin = useCallback(
    (e: ReactPointerEvent, apply: (startRect: Rect, dx: number, dy: number) => Rect) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pointerId = e.pointerId;
      const startRect = latest.current.rect;
      const startX = e.clientX;
      const startY = e.clientY;
      latest.current.onStart?.();

      // Captured pointer events still bubble to window, and window has the typed pointer map.
      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) {
          return;
        }
        const { width, height } = latest.current.getStageSize();
        if (width === 0 || height === 0) {
          return;
        }
        latest.current.onChange(
          apply(startRect, (ev.clientX - startX) / width, (ev.clientY - startY) / height),
        );
      };
      const onUp = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) {
          return;
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [],
  );

  const onMovePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      begin(e, (start, dx, dy) => moveRect(start, dx, dy));
    },
    [begin],
  );

  const onHandlePointerDown = useCallback(
    (handle: ResizeHandle, e: ReactPointerEvent) => {
      begin(e, (start, dx, dy) =>
        resizeRect(start, handle, dx, dy, latest.current.normalizedAspect),
      );
    },
    [begin],
  );

  return { onMovePointerDown, onHandlePointerDown };
}
