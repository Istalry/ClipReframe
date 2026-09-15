import { extname } from 'node:path';

import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants';
import { AppError } from '@shared/errors';

import { probeVideo } from '../services/ffprobe';

import { handle } from './handle';

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
}
