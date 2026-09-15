import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { RunOptions } from './process';
import { runTranscription } from './whisper';

// vi.mock calls are hoisted above the imports by vitest, so the order here is only cosmetic.
const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();
let tempRoot = '';
let modelPath: string | null = 'C:\\app\\resources\\bin\\ggml-base.bin';

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => 'C:\\app' } }));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));
vi.mock('./temp', () => ({
  createTempDir: () => Promise.resolve({ path: tempRoot, dispose: () => Promise.resolve() }),
}));
vi.mock('../binaries', () => ({
  getBinaryPath: (name: string) => `C:\\app\\resources\\bin\\${name}.exe`,
  getWhisperModelPath: () => modelPath,
}));

const whisperJson = {
  result: { language: 'fr' },
  transcription: [
    { offsets: { from: 0, to: 1500 }, text: ' [Musique]' },
    { offsets: { from: 1500, to: 4000 }, text: ' Bonjour à tous' },
    { offsets: { from: 4000, to: 6000 }, text: ' bonjour à tous' },
  ],
};

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'clipreframe-whisper-'));
  run.mockReset();
  modelPath = 'C:\\app\\resources\\bin\\ggml-base.bin';
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('runTranscription', () => {
  it('extracts audio, runs whisper-cli, parses and cleans the cues', async () => {
    run.mockImplementation(async (cmd, _args, options) => {
      if (cmd.endsWith('whisper-cli.exe')) {
        options.onStderrLine?.('whisper_print_progress_callback: progress =  50%');
        await writeFile(join(tempRoot, 'out.json'), JSON.stringify(whisperJson));
      }
      return { stdout: '', stderr: '' };
    });
    const phases: string[] = [];
    const result = await runTranscription({
      jobId: 'w1',
      sourcePath: 'C:\\clips\\in.mp4',
      language: 'fr',
      signal: new AbortController().signal,
      onProgress: (p) => phases.push(`${p.phase}:${p.fraction}`),
    });

    expect(result.detectedLanguage).toBe('fr');
    expect(result.cues.map((c) => c.text)).toEqual(['Bonjour à tous']);
    expect(result.removedCount).toBe(2);
    expect(phases).toEqual(['extracting:0', 'transcribing:0', 'transcribing:0.5', 'cleaning:1']);

    const [ffmpegCall, whisperCall] = run.mock.calls;
    expect(ffmpegCall![0]).toMatch(/ffmpeg\.exe$/);
    expect(ffmpegCall![1]).toEqual(expect.arrayContaining(['-ac', '1', '-ar', '16000']));
    expect(whisperCall![0]).toMatch(/whisper-cli\.exe$/);
    expect(whisperCall![1]).toEqual(
      expect.arrayContaining(['-l', 'fr', '--output-json', '--print-progress']),
    );
  });

  it('fails clearly when no model is bundled', async () => {
    modelPath = null;
    await expect(
      runTranscription({
        jobId: 'w2',
        sourcePath: 'x.mp4',
        language: 'fr',
        signal: new AbortController().signal,
        onProgress: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'BINARY_MISSING' });
    expect(run).not.toHaveBeenCalled();
  });

  it('wraps unexpected output as TRANSCRIBE_FAILED', async () => {
    run.mockImplementation(async (cmd) => {
      if (cmd.endsWith('whisper-cli.exe')) {
        await writeFile(join(tempRoot, 'out.json'), '{"nope":true}');
      }
      return { stdout: '', stderr: '' };
    });
    await expect(
      runTranscription({
        jobId: 'w3',
        sourcePath: 'x.mp4',
        language: 'fr',
        signal: new AbortController().signal,
        onProgress: () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED' });
  });
});
