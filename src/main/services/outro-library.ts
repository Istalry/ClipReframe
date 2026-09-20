import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { AppError } from '@shared/errors';

import { createLogger } from '../logger';

const log = createLogger('outros');

/** Enough of a SHA-1 to make collisions between a user's handful of outros impossible. */
const HASH_CHARS = 12;

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha1');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex').slice(0, HASH_CHARS);
}

/**
 * App-owned copies of outro videos, so a preset keeps working after the original file is moved
 * or deleted. Files are named `<content-hash>-<original name>`: importing the same video twice
 * reuses the copy, and a renamed original still de-duplicates by content.
 */
/** Preview copies sit next to their video: `<copy>.preview.webm`. */
const PREVIEW_SUFFIX = '.preview.webm';

export class OutroLibrary {
  constructor(private readonly dir: string) {}

  static forUserData(userDataDir: string): OutroLibrary {
    return new OutroLibrary(join(userDataDir, 'outros'));
  }

  /** Whether `path` points inside the library (i.e. is one of our copies). */
  isManaged(path: string): boolean {
    return resolve(path)
      .toLowerCase()
      .startsWith(resolve(this.dir).toLowerCase() + '\\');
  }

  /**
   * Where the alpha-capable preview copy of a library video lives; `null` for anything outside
   * the library, which the renderer reports as "pick the outro again".
   */
  previewPath(path: string): string | null {
    return this.isManaged(path) ? `${path}${PREVIEW_SUFFIX}` : null;
  }

  /** Copy `sourcePath` into the library (or reuse an identical copy) and return the stored path. */
  async import(sourcePath: string): Promise<string> {
    if (this.isManaged(sourcePath)) {
      return sourcePath;
    }
    try {
      await access(sourcePath);
    } catch {
      throw new AppError('FILE_NOT_FOUND', 'Outro video not found', sourcePath);
    }
    await mkdir(this.dir, { recursive: true });
    const target = join(this.dir, `${await hashFile(sourcePath)}-${basename(sourcePath)}`);
    // Same name and size means the same content (the name carries the content hash); a size
    // mismatch is a copy that was interrupted, so it is simply made again. No temp + rename:
    // renaming fails with EXDEV on redirected profile folders.
    const [source, existing] = await Promise.all([
      stat(sourcePath),
      stat(target).catch(() => null),
    ]);
    if (existing?.size === source.size) {
      return target;
    }
    try {
      await copyFile(sourcePath, target);
    } catch (err) {
      await rm(target, { force: true }).catch(() => undefined);
      throw err;
    }
    log.info(`imported ${sourcePath} → ${target}`);
    return target;
  }

  /** Delete copies no preset references any more (called at start-up, before any import). */
  async prune(referenced: readonly (string | null | undefined)[]): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      return; // nothing imported yet
    }
    const keep = new Set(
      referenced
        .filter((p): p is string => typeof p === 'string')
        .flatMap((p) => [p, `${p}${PREVIEW_SUFFIX}`])
        .map((p) => resolve(p).toLowerCase()),
    );
    for (const entry of entries) {
      const path = join(this.dir, entry);
      if (!keep.has(resolve(path).toLowerCase())) {
        await rm(path, { force: true });
        log.info(`pruned ${path}`);
      }
    }
  }
}
