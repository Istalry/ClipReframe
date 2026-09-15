import { useEffect } from 'react';

import { invoke, newJobId } from '../api';
import { usePlayerStore } from '../store/player';
import { useProjectStore } from '../store/project';
import { useToastStore } from '../store/toasts';

/**
 * Keep a rendered export mix available for the player whenever the clip has several audio
 * tracks: Chromium only plays a file's default track, so the preview would otherwise not match
 * the export. Re-rendered when the export track selection changes; single-track clips play
 * the file directly.
 */
export function usePreviewMix(): void {
  const source = useProjectStore((s) => s.source);
  const exportTracks = useProjectStore((s) => s.audio.exportTracks);
  const setMix = usePlayerStore((s) => s.setMix);
  const trackKey = exportTracks.join(',');

  useEffect(() => {
    if (!source || source.audioTracks.length <= 1) {
      setMix(null);
      return;
    }
    const jobId = newJobId('mix');
    let cancelled = false;
    setMix(null, true);
    invoke('audio:renderPreview', {
      jobId,
      path: source.path,
      audioTracks: exportTracks,
      duration: source.duration,
    })
      .then(({ path }) => {
        if (!cancelled) {
          setMix(path);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMix(null);
          useToastStore
            .getState()
            .push(
              'info',
              'Preview plays the default audio track',
              err instanceof Error ? err.message : 'The export mix could not be rendered.',
            );
        }
      });
    return () => {
      cancelled = true;
      void invoke('audio:cancelPreview', { jobId }).catch(() => undefined);
    };
    // `trackKey` stands in for the array so a re-created but equal selection does not re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.path, trackKey, setMix]);
}
