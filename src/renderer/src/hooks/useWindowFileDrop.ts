import { useEffect, useState } from 'react';

import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants';

import { getPathForFile } from '../api';
import { useProjectStore } from '../store/project';
import { useToastStore } from '../store/toasts';

export const isSupportedVideoName = (name: string): boolean =>
  (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(
    name.slice(name.lastIndexOf('.')).toLowerCase(),
  );

/** Elements with this attribute handle their own drops; the window handler ignores them. */
export const OWN_DROP_TARGET_ATTR = 'data-own-drop-target';

const hasOwnDropTarget = (e: DragEvent): boolean =>
  e.composedPath().some((n) => n instanceof Element && n.hasAttribute(OWN_DROP_TARGET_ATTR));

/**
 * Accept a video dropped anywhere on the window (replaces the current clip). Also prevents the
 * default Chromium behaviour of navigating to the dropped file. Components that want their own
 * drop target (e.g. the outro panel) mark their root with `OWN_DROP_TARGET_ATTR`; React's
 * synthetic `stopPropagation` runs too late to keep the native event from reaching `window`.
 */
export function useWindowFileDrop(): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e: DragEvent): void => {
      e.preventDefault();
      depth += 1;
      if (e.dataTransfer?.types.includes('Files')) {
        setDragging(true);
      }
    };
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    const onDragLeave = (): void => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setDragging(false);
      }
    };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (hasOwnDropTarget(e)) {
        return;
      }
      const file = e.dataTransfer?.files[0];
      if (!file) {
        return;
      }
      if (!isSupportedVideoName(file.name)) {
        useToastStore
          .getState()
          .push('error', 'Unsupported file', `Use ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}`);
        return;
      }
      void useProjectStore.getState().loadSource(getPathForFile(file));
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return dragging;
}
