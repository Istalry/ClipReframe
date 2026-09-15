import { runExport } from '../services/ffmpeg';
import { jobs } from '../services/jobs';

import { emit, handle } from './handle';

export function registerExportHandlers(): void {
  handle('export:start', async ({ jobId, ...request }, event) => {
    const signal = jobs.start(jobId);
    try {
      const outputPath = await runExport({
        jobId,
        request,
        signal,
        onProgress: (progress) => {
          emit(event.sender, 'export:progress', progress);
        },
      });
      return { outputPath };
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('export:cancel', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
