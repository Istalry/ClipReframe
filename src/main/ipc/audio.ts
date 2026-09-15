import { jobs } from '../services/jobs';
import { renderPreviewAudio } from '../services/preview-audio';

import { handle } from './handle';

export function registerAudioHandlers(): void {
  handle('audio:renderPreview', async ({ jobId, path, audioTracks, duration }) => {
    const signal = jobs.start(jobId);
    try {
      return {
        path: await renderPreviewAudio({ sourcePath: path, audioTracks, duration, signal }),
      };
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('audio:cancelPreview', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
