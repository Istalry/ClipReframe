import { useEffect } from 'react';

import { useOutroPreviewStore } from '../store/outroPreview';
import { useProjectStore } from '../store/project';

/**
 * Render the outro's preview copy as soon as one is picked (or a preset brings one back), so
 * switching the placement to "on top" shows it immediately. Copies are cached on disk.
 */
export function useOutroPreview(): void {
  const outroPath = useProjectStore((s) => s.settings.outro?.path);
  const ensure = useOutroPreviewStore((s) => s.ensure);
  const reset = useOutroPreviewStore((s) => s.reset);

  useEffect(() => {
    if (outroPath) {
      void ensure(outroPath);
    } else {
      reset();
    }
  }, [outroPath, ensure, reset]);
}
