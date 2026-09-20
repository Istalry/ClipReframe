import { probeVideo } from '../services/ffprobe';
import { jobs } from '../services/jobs';
import type { OutroLibrary } from '../services/outro-library';
import { makeOutroPreview } from '../services/outro-preview';

import { emit, handle } from './handle';

export function registerOutroHandlers(library: OutroLibrary): void {
  handle('outro:import', async ({ path }) => ({ path: await library.import(path) }));

  handle('outro:preparePreview', async ({ jobId, path }, event) => {
    const outputPath = library.previewPath(path);
    if (!outputPath) {
      // Only library copies get a preview; an outro from an older preset is re-imported first.
      return { path: null };
    }
    const signal = jobs.start(jobId);
    try {
      const source = await probeVideo(path);
      return {
        path: await makeOutroPreview({
          jobId,
          source,
          outputPath,
          signal,
          onProgress: (progress) => {
            emit(event.sender, 'outro:previewProgress', progress);
          },
        }),
      };
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('outro:cancelPreview', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
