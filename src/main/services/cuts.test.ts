import { AppError } from '@shared/errors';
import type { VideoInfo } from '@shared/types';

import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => 'E:/app', getPath: () => 'E:/userData' },
}));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));

const { detectCuts } = await import('./cuts');

const source: VideoInfo = {
  path: 'C:\\clips\\in.mp4',
  fileName: 'in.mp4',
  width: 1920,
  height: 1080,
  duration: 20,
  fps: 30,
  videoCodec: 'h264',
  audioTracks: [],
};

const detect = async (
  onProgress = vi.fn<(p: { jobId: string; fraction: number }) => void>(),
): Promise<{ cuts: number[]; onProgress: typeof onProgress }> => ({
  cuts: await detectCuts({
    jobId: 'j1',
    source,
    threshold: 10,
    signal: new AbortController().signal,
    onProgress,
  }),
  onProgress,
});

describe('detectCuts', () => {
  beforeEach(() => {
    run.mockReset();
  });

  it('collects the scene times scdet logs and reports progress', async () => {
    run.mockImplementation((_cmd, _args, options) => {
      options.onStderrLine?.('[Parsed_scdet_1 @ 0x1] lavfi.scd.score: 15.6, lavfi.scd.time: 12.5');
      options.onStderrLine?.('frame=  120 fps=57 q=-0.0 size=N/A');
      options.onStderrLine?.('[Parsed_scdet_1 @ 0x1] lavfi.scd.score: 21.0, lavfi.scd.time: 3');
      options.onStdoutLine?.('out_time_us=10000000');
      options.onStdoutLine?.('progress=continue');
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const { cuts, onProgress } = await detect();
    expect(cuts).toEqual([3, 12.5]);
    expect(onProgress).toHaveBeenCalledWith({ jobId: 'j1', fraction: 0.5 });
  });

  it('analyses the source with scdet and writes nothing', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    await detect();
    const [command, args] = run.mock.calls[0] ?? [];
    expect(command).toMatch(/ffmpeg/);
    expect(args).toEqual(expect.arrayContaining(['-i', source.path]));
    expect(args?.join(' ')).toContain('scdet=threshold=10');
    expect(args?.slice(-3)).toEqual(['-f', 'null', '-']);
  });

  it('propagates a cancellation', async () => {
    run.mockRejectedValue(new AppError('EXPORT_CANCELLED', 'Cancelled'));
    await expect(detect()).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
  });

  it('wraps an unexpected failure', async () => {
    run.mockRejectedValue(new Error('boom'));
    await expect(detect()).rejects.toMatchObject({ code: 'EXPORT_FAILED', message: 'boom' });
  });
});
