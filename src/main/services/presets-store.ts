import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { AppError } from '@shared/errors';
import {
  createEmptyPresetsFile,
  migratePresetsFile,
  type PresetsFile,
} from '@shared/presets/schema';
import type { Preset, ProjectSettings } from '@shared/types';

import { createLogger } from '../logger';

const log = createLogger('presets');

export interface SavePresetInput {
  id?: string | undefined;
  name: string;
  settings: ProjectSettings;
}

/**
 * JSON-file backed preset storage. Reads are validated; writes are atomic (temp + rename) so a
 * crash mid-write never leaves a half-written file behind.
 */
export class PresetsStore {
  private cache: PresetsFile | null = null;

  constructor(private readonly filePath: string) {}

  static forUserData(userDataDir: string): PresetsStore {
    return new PresetsStore(join(userDataDir, 'presets.json'));
  }

  async load(): Promise<PresetsFile> {
    if (this.cache) {
      return this.cache;
    }
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = createEmptyPresetsFile();
        return this.cache;
      }
      throw err;
    }
    try {
      this.cache = migratePresetsFile(JSON.parse(raw));
    } catch (err) {
      // Keep the user's data for manual recovery, then start fresh so the app stays usable.
      const backup = `${this.filePath}.corrupt-${Date.now()}.json`;
      await copyFile(this.filePath, backup);
      log.error(`presets.json is invalid; backed up to ${backup}`, err);
      this.cache = createEmptyPresetsFile();
      await this.persist();
      throw new AppError(
        'PRESETS_CORRUPT',
        'Your presets file was unreadable and has been reset.',
        `A backup was saved to ${backup}`,
      );
    }
    return this.cache;
  }

  async save(input: SavePresetInput): Promise<Preset> {
    const file = await this.load();
    const now = new Date().toISOString();
    const existing = input.id ? file.presets.find((p) => p.id === input.id) : undefined;

    let preset: Preset;
    if (existing) {
      preset = { ...existing, ...input.settings, name: input.name, updatedAt: now };
      file.presets = file.presets.map((p) => (p.id === preset.id ? preset : p));
    } else {
      preset = {
        ...input.settings,
        id: randomUUID(),
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      file.presets.push(preset);
    }
    await this.persist();
    return preset;
  }

  async delete(id: string): Promise<PresetsFile> {
    const file = await this.load();
    if (!file.presets.some((p) => p.id === id)) {
      throw new AppError('PRESET_NOT_FOUND', 'Preset not found');
    }
    file.presets = file.presets.filter((p) => p.id !== id);
    if (file.defaultPresetId === id) {
      file.defaultPresetId = null;
    }
    await this.persist();
    return file;
  }

  async setDefault(id: string | null): Promise<PresetsFile> {
    const file = await this.load();
    if (id !== null && !file.presets.some((p) => p.id === id)) {
      throw new AppError('PRESET_NOT_FOUND', 'Preset not found');
    }
    file.defaultPresetId = id;
    await this.persist();
    return file;
  }

  private async persist(): Promise<void> {
    if (!this.cache) {
      return;
    }
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(this.cache, null, 2), 'utf8');
    await rename(tmp, this.filePath);
  }
}
