import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AppError } from '@shared/errors';
import { createDefaultSettings } from '@shared/presets/schema';
import type { ExportRequest, VideoInfo } from '@shared/types';

import { runExport } from './ffmpeg';
import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();
let tempRoot = '';

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => 'C:\\app' } }));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));
vi.mock('./temp', () => ({
  createTempDir: () => Promise.resolve({ path: tempRoot, dispose: () => Promise.resolve() }),
}));

const source: VideoInfo = {
  path: 'C:\\clips\\in.mp4',
  fileName: 'in.mp4',
  width: 1920,
  height: 1080,
  duration: 10,
  fps: 30,
  videoCodec: 'h264',
  hasAudio: true,
};

const request = (overrides: Partial<ExportRequest> = {}): ExportRequest => ({
  source,
  settings: createDefaultSettings(),
  cues: [],
  outro: null,
  outputPath: join(tempRoot, 'out.mp4'),
  ...overrides,
});

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'clipreframe-ffmpeg-'));
  run.mockReset();
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('runExport', () => {
  it('spawns ffmpeg in the temp dir and reports progress from stdout blocks', async () => {
    run.mockImplementation((_cmd, _args, options) => {
      options.onStdoutLine?.('out_time_us=2500000');
      options.onStdoutLine?.('speed=2x');
      options.onStdoutLine?.('progress=continue');
      return Promise.resolve({ stdout: '', stderr: '' });
    });
    const progress: number[] = [];
    const out = await runExport({
      jobId: 'j1',
      request: request(),
      signal: new AbortController().signal,
      onProgress: (p) => progress.push(p.fraction),
    });
    expect(out).toBe(join(tempRoot, 'out.mp4'));
    const [cmd, args, options] = run.mock.calls[0]!;
    expect(cmd).toMatch(/ffmpeg\.exe$/);
    expect(options.cwd).toBe(tempRoot);
    expect(args).toContain('-filter_complex');
    expect(args[args.length - 1]).toBe(join(tempRoot, 'out.mp4'));
    // 2.5 s of 10 s, then the final 100 %.
    expect(progress).toEqual([0.25, 1]);
  });

  it('writes subs.ass and references it when subtitles are enabled', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    const settings = createDefaultSettings();
    settings.subtitles.enabled = true;
    await runExport({
      jobId: 'j2',
      request: request({ settings, cues: [{ id: 'c', start: 1, end: 2, text: 'Salut' }] }),
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    const ass = await readFile(join(tempRoot, 'subs.ass'), 'utf8');
    expect(ass).toContain('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Salut');
    const args = run.mock.calls[0]![1];
    expect(args.join(' ')).toContain('subtitles=subs.ass');
  });

  it('skips subtitles when enabled but there are no cues', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    const settings = createDefaultSettings();
    settings.subtitles.enabled = true;
    await runExport({
      jobId: 'j3',
      request: request({ settings, cues: [] }),
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    expect(run.mock.calls[0]![1].join(' ')).not.toContain('subtitles=');
  });

  it('removes the partial output and rethrows on failure or cancel', async () => {
    const outputPath = join(tempRoot, 'partial.mp4');
    run.mockImplementation(async () => {
      await writeFile(outputPath, 'partial');
      throw new AppError('EXPORT_CANCELLED', 'Cancelled');
    });
    await expect(
      runExport({
        jobId: 'j4',
        request: request({ outputPath }),
        signal: new AbortController().signal,
        onProgress: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
    await expect(readFile(outputPath)).rejects.toThrow();
  });
});
