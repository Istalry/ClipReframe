// Downloads the third-party binaries the app spawns at runtime into resources/bin/.
// Windows-only (uses PowerShell Expand-Archive so we need no zip dependency).
//
// Usage:  node scripts/fetch-binaries.mjs [--force]
// Env:    WHISPER_MODEL=base|small|medium   (default: base)
//         FFMPEG_TAG=latest|autobuild-YYYY-MM-DD-HH-MM   (default: latest)

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN_DIR = join(ROOT, 'resources', 'bin');
const FORCE = process.argv.includes('--force');
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'base';
const FFMPEG_TAG = process.env.FFMPEG_TAG ?? 'latest';
const WHISPER_TAG = 'b5130';

const FFMPEG_URL = `https://github.com/BtbN/FFmpeg-Builds/releases/download/${FFMPEG_TAG}/ffmpeg-master-latest-win64-gpl-shared.zip`;
const WHISPER_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_TAG}/whisper-bin-x64.zip`;
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${WHISPER_MODEL}.bin`;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  console.log(`↓ ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  await mkdir(dirname(dest), { recursive: true });
  const hash = createHash('sha256');
  const total = Number(res.headers.get('content-length') ?? 0);
  let received = 0;
  let lastPrinted = 0;
  const progress = new TransformStream({
    transform(chunk, controller) {
      hash.update(chunk);
      received += chunk.byteLength;
      if (total && received - lastPrinted > 5_000_000) {
        lastPrinted = received;
        process.stdout.write(`\r  ${Math.round((received / total) * 100)}%`);
      }
      controller.enqueue(chunk);
    },
  });
  await pipeline(res.body.pipeThrough(progress), createWriteStream(dest));
  process.stdout.write('\r');
  console.log(`  sha256 ${hash.digest('hex')}  (${Math.round(received / 1_000_000)} MB)`);
}

async function unzip(zipPath, destDir) {
  await rm(destDir, { recursive: true, force: true });
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`,
  ]);
}

async function findFile(dir, name) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFile(full, name);
      if (found) {
        return found;
      }
    } else if (entry.name.toLowerCase() === name.toLowerCase()) {
      return full;
    }
  }
  return null;
}

async function copySiblings(file, filter) {
  const dir = dirname(file);
  for (const entry of await readdir(dir)) {
    if (filter(entry)) {
      await cp(join(dir, entry), join(BIN_DIR, entry));
    }
  }
}

async function fetchFfmpeg(work) {
  if (
    !FORCE &&
    (await exists(join(BIN_DIR, 'ffmpeg.exe'))) &&
    (await exists(join(BIN_DIR, 'ffprobe.exe')))
  ) {
    console.log('✓ ffmpeg/ffprobe already present');
    return;
  }
  const zip = join(work, 'ffmpeg.zip');
  await download(FFMPEG_URL, zip);
  const extracted = join(work, 'ffmpeg');
  await unzip(zip, extracted);
  const ffmpeg = await findFile(extracted, 'ffmpeg.exe');
  if (!ffmpeg) {
    throw new Error('ffmpeg.exe not found in archive');
  }
  // Shared build: copy the two executables we use and every DLL next to them (skip ffplay).
  await copySiblings(ffmpeg, (n) => /\.dll$/i.test(n) || /^ff(mpeg|probe)\.exe$/i.test(n));
  console.log('✓ ffmpeg/ffprobe installed');
}

async function fetchWhisper(work) {
  if (!FORCE && (await exists(join(BIN_DIR, 'whisper-cli.exe')))) {
    console.log('✓ whisper-cli already present');
    return;
  }
  const zip = join(work, 'whisper.zip');
  await download(WHISPER_URL, zip);
  const extracted = join(work, 'whisper');
  await unzip(zip, extracted);
  const cli = await findFile(extracted, 'whisper-cli.exe');
  if (!cli) {
    throw new Error('whisper-cli.exe not found in archive');
  }
  await copySiblings(cli, (n) => /\.dll$/i.test(n) || /^whisper-cli\.exe$/i.test(n));
  console.log('✓ whisper-cli installed');
}

async function fetchModel() {
  const dest = join(BIN_DIR, `ggml-${WHISPER_MODEL}.bin`);
  if (!FORCE && (await exists(dest)) && (await stat(dest)).size > 1_000_000) {
    console.log(`✓ model ggml-${WHISPER_MODEL}.bin already present`);
    return;
  }
  await download(MODEL_URL, dest);
  console.log(`✓ model ggml-${WHISPER_MODEL}.bin installed`);
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('ClipReframe targets Windows; run this script on Windows.');
  }
  await mkdir(BIN_DIR, { recursive: true });
  const work = join(tmpdir(), `clipreframe-bin-${Date.now()}`);
  await mkdir(work, { recursive: true });
  try {
    await fetchFfmpeg(work);
    await fetchWhisper(work);
    await fetchModel();
    console.log(`\nAll binaries are in ${BIN_DIR}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
