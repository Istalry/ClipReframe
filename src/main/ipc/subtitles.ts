import { jobs } from '../services/jobs';
import { runTranscription } from '../services/whisper';

import { emit, handle } from './handle';

export function registerSubtitleHandlers(): void {
  handle('subtitles:transcribe', async ({ jobId, path, language }, event) => {
    const signal = jobs.start(jobId);
    try {
      return await runTranscription({
        jobId,
        sourcePath: path,
        language,
        signal,
        onProgress: (progress) => {
          emit(event.sender, 'subtitles:progress', progress);
        },
      });
    } finally {
      jobs.finish(jobId);
    }
  });

  handle('subtitles:cancel', ({ jobId }) => {
    jobs.cancel(jobId);
  });
}
