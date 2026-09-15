import { runExport } from '../services/ffmpeg';
import { jobs } from '../services/jobs';

import { emit, handle } from './handle';

export function registerExportHandlers(): void {
  handle('export:start', async ({ jobId, ...request }, event) => {
    const signal = jobs.start(jobId);
    try {
      return await runExport({
        jobId,
        request,
        signal,
        onProgress: (progress) => {
          emit(event.sender, 'export:progress', progress);
        },
      });
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('export:cancel', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
