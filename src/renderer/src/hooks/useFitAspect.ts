import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface FittedSize {
  width: number;
  height: number;
}

/**
 * Largest `aspect` (w/h) box that fits inside the referenced container, tracked with a
 * ResizeObserver. CSS `aspect-ratio` cannot honour both a max-width and a max-height, so the
 * stage and preview size themselves from this instead.
 */
export function useFitAspect(container: RefObject<HTMLElement | null>, aspect: number): FittedSize {
  const [size, setSize] = useState<FittedSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) {
      return;
    }
    const update = (): void => {
      const { clientWidth, clientHeight } = el;
      const width = Math.min(clientWidth, clientHeight * aspect);
      const height = width / aspect;
      setSize((prev) =>
        Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
          ? prev
          : { width, height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [container, aspect]);

  return size;
}
