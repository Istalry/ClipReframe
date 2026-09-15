import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AppError } from '@shared/errors';

import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();

// Own temp root so a running dev app's mix folder cannot leak into the counts below.
const root = await mkdtemp(join(tmpdir(), 'clipreframe-preview-audio-test-'));
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => 'E:/app', getPath: () => root },
}));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));

const { renderPreviewAudio, disposePreviewAudio } = await import('./preview-audio');

const tempDirs = async (): Promise<string[]> =>
  (await readdir(root)).filter((n) => n.startsWith('clipreframe-preview-audio-'));

beforeEach(() => {
  run.mockReset();
});

afterEach(async () => {
  await disposePreviewAudio();
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('renderPreviewAudio', () => {
  it('mixes the selected tracks with the export filter into an m4a', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    const path = await renderPreviewAudio({
      sourcePath: 'C:\\clips\\in.mkv',
      audioTracks: [0, 2],
      duration: 12,
      signal: new AbortController().signal,
    });
    expect(path).toMatch(/mix\.m4a$/);
    const args = run.mock.calls[0]![1];
    const graph = args[args.indexOf('-filter_complex') + 1];
    expect(graph).toContain('[0:a:0]');
    expect(graph).toContain('[0:a:2]');
    expect(graph).toContain('amix=inputs=2');
    expect(args).toEqual(expect.arrayContaining(['-vn', '-c:a', 'aac']));
  });

  it('keeps only the latest mix folder', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    await renderPreviewAudio({
      sourcePath: 'a',
      audioTracks: [0],
      duration: 1,
      signal: new AbortController().signal,
    });
    await renderPreviewAudio({
      sourcePath: 'a',
      audioTracks: [1],
      duration: 1,
      signal: new AbortController().signal,
    });
    expect(await tempDirs()).toHaveLength(1);
    await disposePreviewAudio();
    expect(await tempDirs()).toHaveLength(0);
  });

  it('removes its folder and rethrows when ffmpeg fails', async () => {
    run.mockRejectedValue(new AppError('EXPORT_CANCELLED', 'Cancelled'));
    await expect(
      renderPreviewAudio({
        sourcePath: 'a',
        audioTracks: [0],
        duration: 1,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(await tempDirs()).toHaveLength(0);
  });
});
