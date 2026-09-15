import { extname } from 'node:path';

import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants';
import { AppError } from '@shared/errors';

import { probeVideo } from '../services/ffprobe';
import { jobs } from '../services/jobs';
import { makeProxy } from '../services/proxy';

import { emit, handle } from './handle';

export function registerVideoHandlers(): void {
  handle('video:probe', ({ path }) => {
    const ext = extname(path).toLowerCase();
    if (!(SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new AppError(
        'UNSUPPORTED_MEDIA',
        `Unsupported file type "${ext || 'none'}". Use ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}.`,
      );
    }
    return probeVideo(path);
  });

  handle('video:makeProxy', async ({ jobId, path, encoder }, event) => {
    const signal = jobs.start(jobId);
    try {
      const source = await probeVideo(path);
      const proxyPath = await makeProxy({
        jobId,
        source,
        encoder,
        signal,
        onProgress: (progress) => {
          emit(event.sender, 'video:proxyProgress', progress);
        },
      });
      return { path: proxyPath };
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('video:cancelProxy', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
