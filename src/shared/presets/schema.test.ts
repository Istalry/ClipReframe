import {
  createDefaultSettings,
  createEmptyPresetsFile,
  migratePresetsFile,
  presetSchema,
  projectSettingsSchema,
} from './schema';

describe('projectSettingsSchema', () => {
  it('accepts the default settings', () => {
    expect(projectSettingsSchema.safeParse(createDefaultSettings()).success).toBe(true);
  });

  it('defaults subtitles to French and disabled', () => {
    const s = createDefaultSettings();
    expect(s.subtitles.language).toBe('fr');
    expect(s.subtitles.enabled).toBe(false);
    expect(s.outro).toBeNull();
  });

  it('rejects out-of-range rects and colours', () => {
    const s = createDefaultSettings();
    expect(
      projectSettingsSchema.safeParse({ ...s, webcamRect: { ...s.webcamRect, x: 1.5 } }).success,
    ).toBe(false);
    expect(
      projectSettingsSchema.safeParse({
        ...s,
        subtitles: { ...s.subtitles, style: { ...s.subtitles.style, primaryColor: 'white' } },
      }).success,
    ).toBe(false);
  });
});

describe('presets file', () => {
  it('round-trips an empty file', () => {
    const file = createEmptyPresetsFile();
    expect(migratePresetsFile(JSON.parse(JSON.stringify(file)))).toEqual(file);
  });

  it('rejects an unknown version', () => {
    expect(() => migratePresetsFile({ version: 99, defaultPresetId: null, presets: [] })).toThrow();
  });

  it('validates a full preset', () => {
    const preset = {
      ...createDefaultSettings(),
      id: 'p1',
      name: 'My preset',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(presetSchema.safeParse(preset).success).toBe(true);
    expect(presetSchema.safeParse({ ...preset, name: '' }).success).toBe(false);
  });
});
