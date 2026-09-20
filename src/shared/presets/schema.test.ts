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

  it('defaults subtitles to auto-detect and disabled', () => {
    const s = createDefaultSettings();
    expect(s.subtitles.language).toBe('auto');
    expect(s.subtitles.enabled).toBe(false);
    expect(s.outro).toBeNull();
  });

  it('defaults the word highlight to a purple box for presets saved before 0.1.1', () => {
    const s = createDefaultSettings();
    const { highlightMode: _mode, highlightColor: _color, ...legacyStyle } = s.subtitles.style;
    const parsed = projectSettingsSchema.parse({
      ...s,
      subtitles: { ...s.subtitles, style: legacyStyle },
    });
    expect(parsed.subtitles.style.highlightMode).toBe('box');
    expect(parsed.subtitles.style.highlightColor).toBe('#a970ff');
    expect(parsed.subtitles.style.offsetY).toBe(0);
    expect(
      projectSettingsSchema.safeParse({
        ...s,
        subtitles: { ...s.subtitles, style: { ...s.subtitles.style, highlightColor: 'purple' } },
      }).success,
    ).toBe(false);
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
