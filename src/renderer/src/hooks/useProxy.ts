import { useEffect } from 'react';

import { useProjectStore } from '../store/project';
import { useProxyStore } from '../store/proxy';

/**
 * Drop the preview proxy (and cancel a running job) whenever the clip changes. Proxies are only
 * made on demand, from the <video> error handler in SourceStage: what Chromium can decode
 * depends on the machine (hardware HEVC, 10-bit…), so a codec list would be wrong somewhere.
 */
export function useProxy(): void {
  const sourcePath = useProjectStore((s) => s.source?.path);
  const reset = useProxyStore((s) => s.reset);

  useEffect(() => reset, [sourcePath, reset]);
}
