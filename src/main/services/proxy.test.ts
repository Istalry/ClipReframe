import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AppError } from '@shared/errors';
import type { VideoInfo } from '@shared/types';

import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();

const root = await mkdtemp(join(tmpdir(), 'clipreframe-proxy-test-'));
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => 'E:/app', getPath: () => root },
}));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));

const { makeProxy, disposeProxy } = await import('./proxy');

const source: VideoInfo = {
  path: 'C:\\clips\\in.mkv',
  fileName: 'in.mkv',
  width: 1920,
  height: 1080,
  duration: 8,
  fps: 30,
  videoCodec: 'hevc',
  audioTracks: [],
};

const tempDirs = async (): Promise<string[]> =>
  (await readdir(root)).filter((n) => n.startsWith('clipreframe-proxy-'));

beforeEach(() => {
  run.mockReset();
});

afterEach(async () => {
  await disposeProxy();
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('makeProxy', () => {
  it('transcodes with progress and returns the proxy path', async () => {
    run.mockImplementation((_cmd, _args, options) => {
      options.onStdoutLine?.('out_time_us=4000000');
      options.onStdoutLine?.('progress=continue');
      return Promise.resolve({ stdout: '', stderr: '' });
    });
    const fractions: number[] = [];
    const path = await makeProxy({
      jobId: 'p1',
      source,
      encoder: 'libx264',
      signal: new AbortController().signal,
      onProgress: (p) => fractions.push(p.fraction),
    });
    expect(path).toMatch(/proxy\.mp4$/);
    expect(fractions).toEqual([0.5]);
    expect(run.mock.calls[0]![1]).toContain(source.path);
  });

  it('cleans up on failure', async () => {
    run.mockRejectedValue(new AppError('EXPORT_CANCELLED', 'Cancelled'));
    await expect(
      makeProxy({
        jobId: 'p2',
        source,
        encoder: 'libx264',
        signal: new AbortController().signal,
        onProgress: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(await tempDirs()).toHaveLength(0);
  });
});
