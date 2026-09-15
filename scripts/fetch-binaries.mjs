// Downloads the third-party binaries the app spawns at runtime into resources/bin/.
// Windows-only (uses PowerShell Expand-Archive so we need no zip dependency).
//
// Usage:  node scripts/fetch-binaries.mjs [--force]
// Env:    WHISPER_MODEL=tiny|base|small|medium   (default: small)
//         FFMPEG_TAG=latest                              rolling BtbN master build instead of the pin
//         FFMPEG_TAG=autobuild-YYYY-MM-DD-HH-MM FFMPEG_ASSET=<zip name>   any other pinned build
//
// Downloads are verified against the SHA-256 recorded in EXPECTED_SHA256 when the URL is one of
// the pinned defaults; overriding the tag or model skips verification (a warning is printed).

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
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'small';
// Pinned to the FFmpeg 9.0 release branch; BtbN names assets after the exact commit, so a tag
// bump needs the matching asset name too.
const FFMPEG_TAG = process.env.FFMPEG_TAG ?? 'autobuild-2026-09-15-13-18';
const FFMPEG_ASSET =
  process.env.FFMPEG_ASSET ??
  (FFMPEG_TAG === 'latest'
    ? 'ffmpeg-master-latest-win64-gpl-shared.zip'
    : 'ffmpeg-n9.0.1-30-g9258bacca5-win64-gpl-shared-9.0.zip');
const WHISPER_TAG = 'b5130';

const FFMPEG_URL = `https://github.com/BtbN/FFmpeg-Builds/releases/download/${FFMPEG_TAG}/${FFMPEG_ASSET}`;
const WHISPER_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_TAG}/whisper-bin-x64.zip`;
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${WHISPER_MODEL}.bin`;

/**
 * Known-good digests of the pinned artefacts, keyed by their exact URL so that overriding the tag
 * or model simply skips verification. Update when bumping a tag or the default model.
 */
const EXPECTED_SHA256 = {
  'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-15-13-18/ffmpeg-n9.0.1-30-g9258bacca5-win64-gpl-shared-9.0.zip':
    'b224cfe325bf9bd9818d6e48a9d6cdb5fa9feebff0d26cc50c793a47e1e6fc4f',
  'https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip':
    'f9ec6c52a2e949b62ab51fa21d0d497958f9e41c3010c157c4e42932d5316f3c',
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin':
    '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
};

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
  const digest = hash.digest('hex');
  console.log(`  sha256 ${digest}  (${Math.round(received / 1_000_000)} MB)`);
  const expected = EXPECTED_SHA256[url];
  if (expected === undefined) {
    console.warn('  ! no pinned checksum for this URL; skipping verification');
  } else if (expected !== digest) {
    await rm(dest, { force: true });
    throw new Error(`Checksum mismatch for ${url}\n  expected ${expected}\n  got      ${digest}`);
  }
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

const isRuntimeDll = (name) => /\.dll$/i.test(name) && !/^SDL2\.dll$/i.test(name);

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
  // Shared build: copy the two executables we use and every DLL next to them (skip ffplay and
  // SDL2, which only ffplay needs).
  await copySiblings(ffmpeg, (n) => isRuntimeDll(n) || /^ff(mpeg|probe)\.exe$/i.test(n));
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
  await copySiblings(cli, (n) => isRuntimeDll(n) || /^whisper-cli\.exe$/i.test(n));
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
