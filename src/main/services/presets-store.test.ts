import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createDefaultSettings } from '@shared/presets/schema';

import { PresetsStore } from './presets-store';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'clipreframe-presets-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('PresetsStore', () => {
  it('starts empty when the file does not exist', async () => {
    const store = PresetsStore.forUserData(dir);
    expect(await store.load()).toEqual({ version: 1, defaultPresetId: null, presets: [] });
  });

  it('creates, updates, defaults and deletes presets, persisting to disk', async () => {
    const store = PresetsStore.forUserData(dir);
    const created = await store.save({ name: 'Shorts', settings: createDefaultSettings() });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Shorts');

    const updated = await store.save({
      id: created.id,
      name: 'Shorts v2',
      settings: { ...createDefaultSettings(), layout: 'fill' },
    });
    expect(updated.id).toBe(created.id);
    expect(updated.layout).toBe('fill');
    expect(updated.createdAt).toBe(created.createdAt);

    await store.setDefault(created.id);

    // A fresh store instance must see the same data.
    const reloaded = await PresetsStore.forUserData(dir).load();
    expect(reloaded.presets).toHaveLength(1);
    expect(reloaded.presets[0]?.name).toBe('Shorts v2');
    expect(reloaded.defaultPresetId).toBe(created.id);

    const afterDelete = await store.delete(created.id);
    expect(afterDelete.presets).toHaveLength(0);
    expect(afterDelete.defaultPresetId).toBeNull();
  });

  it('rejects unknown ids', async () => {
    const store = PresetsStore.forUserData(dir);
    await expect(store.delete('nope')).rejects.toMatchObject({ code: 'PRESET_NOT_FOUND' });
    await expect(store.setDefault('nope')).rejects.toMatchObject({ code: 'PRESET_NOT_FOUND' });
  });

  it('backs up and resets a corrupt file', async () => {
    await writeFile(join(dir, 'presets.json'), '{ not json', 'utf8');
    const store = PresetsStore.forUserData(dir);
    await expect(store.load()).rejects.toMatchObject({ code: 'PRESETS_CORRUPT' });
    const files = await readdir(dir);
    expect(files.some((f) => f.includes('.corrupt-'))).toBe(true);
    expect(JSON.parse(await readFile(join(dir, 'presets.json'), 'utf8'))).toEqual({
      version: 1,
      defaultPresetId: null,
      presets: [],
    });
    // Subsequent loads work on the reset file.
    expect((await store.load()).presets).toEqual([]);
  });
});
