import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AppError } from '@shared/errors';
import type { VideoInfo } from '@shared/types';

import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => 'E:/app', getPath: () => 'E:/userData' },
}));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));

const { makeOutroPreview } = await import('./outro-preview');

const source: VideoInfo = {
  path: 'C:\\outros\\cta.mov',
  fileName: 'cta.mov',
  width: 2160,
  height: 3840,
  duration: 6,
  fps: 60,
  videoCodec: 'prores',
  audioTracks: [],
};

let root: string;
const outputPath = (): string => join(root, 'cta.mov.preview.webm');

beforeEach(async () => {
  run.mockReset();
  root = await mkdtemp(join(tmpdir(), 'clipreframe-outro-preview-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const make = (
  onProgress = vi.fn<(p: { jobId: string; fraction: number }) => void>(),
): Promise<string> =>
  makeOutroPreview({
    jobId: 'j1',
    source,
    outputPath: outputPath(),
    signal: new AbortController().signal,
    onProgress,
  });

describe('makeOutroPreview', () => {
  it('renders to a partial file, reports progress and renames it when done', async () => {
    run.mockImplementation(async (_cmd, args, options) => {
      await writeFile(args[args.length - 1] ?? '', 'webm bytes');
      options.onStdoutLine?.('out_time_us=3000000');
      options.onStdoutLine?.('progress=continue');
      return { stdout: '', stderr: '' };
    });
    const onProgress = vi.fn<(p: { jobId: string; fraction: number }) => void>();

    expect(await make(onProgress)).toBe(outputPath());
    expect(onProgress).toHaveBeenCalledWith({ jobId: 'j1', fraction: 0.5 });
    expect(await readdir(root)).toEqual(['cta.mov.preview.webm']);
    expect(await readFile(outputPath(), 'utf8')).toBe('webm bytes');
    expect(run.mock.calls[0]?.[1]).toContain(`${outputPath()}.partial`);
  });

  it('reuses a finished copy without running ffmpeg', async () => {
    await writeFile(outputPath(), 'already there');
    const onProgress = vi.fn<(p: { jobId: string; fraction: number }) => void>();

    expect(await make(onProgress)).toBe(outputPath());
    expect(run).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({ jobId: 'j1', fraction: 1 });
  });

  it('removes the partial file and rethrows on failure or cancel', async () => {
    run.mockImplementation(async (_cmd, args) => {
      await writeFile(args[args.length - 1] ?? '', 'half');
      throw new AppError('EXPORT_CANCELLED', 'Cancelled');
    });

    await expect(make()).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(await readdir(root)).toEqual([]);
  });

  it('wraps an unexpected failure', async () => {
    run.mockRejectedValue(new Error('vp9 exploded'));
    await expect(make()).rejects.toMatchObject({ code: 'EXPORT_FAILED' });
  });
});
