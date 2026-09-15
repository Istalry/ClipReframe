import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { app } from 'electron';

export type BinaryName = 'ffmpeg' | 'ffprobe' | 'whisper-cli';

/** `resources/bin` in development, `<install>/resources/bin` when packaged (see electron-builder.yml). */
export function getBinDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'bin')
    : resolve(app.getAppPath(), 'resources', 'bin');
}

export function getBinaryPath(name: BinaryName): string {
  return join(getBinDir(), `${name}.exe`);
}

/** First `ggml-*.bin` found; `fetch-binaries` decides which model is shipped. */
export function getWhisperModelPath(): string | null {
  const dir = getBinDir();
  if (!existsSync(dir)) {
    return null;
  }
  // Accuracy first: the fetch script ships `small` by default; larger models win if present.
  const preferred = ['ggml-medium.bin', 'ggml-small.bin', 'ggml-base.bin', 'ggml-tiny.bin'];
  const files = readdirSync(dir).filter((f) => /^ggml-.*\.bin$/i.test(f));
  const pick = preferred.find((p) => files.includes(p)) ?? files[0];
  return pick ? join(dir, pick) : null;
}

export function getSystemFontsDir(): string {
  return join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts');
}

export interface BinaryCheck {
  ok: boolean;
  missing: string[];
}

export function checkBinaries(): BinaryCheck {
  const missing: string[] = [];
  for (const name of ['ffmpeg', 'ffprobe', 'whisper-cli'] as const) {
    if (!existsSync(getBinaryPath(name))) {
      missing.push(`${name}.exe`);
    }
  }
  if (!getWhisperModelPath()) {
    missing.push('ggml-*.bin (whisper model)');
  }
  return { ok: missing.length === 0, missing };
}
