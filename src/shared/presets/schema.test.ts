import { gameplayAspectFor } from '../geometry/layout';

import {
  createDefaultSettings,
  createEmptyPresetsFile,
  migratePresetsFile,
  presetSchema,
  projectSettingsSchema,
} from './schema';

/** The frame the schema's own defaults are computed against. */
const HD = { width: 1920, height: 1080 };

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
    expect([parsed.subtitles.style.boxPaddingX, parsed.subtitles.style.boxPaddingY]).toEqual([
      10, 4,
    ]);
    expect(
      projectSettingsSchema.safeParse({
        ...s,
        subtitles: { ...s.subtitles, style: { ...s.subtitles.style, boxPaddingX: 61 } },
      }).success,
    ).toBe(false);
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

describe('fillRect migration', () => {
  // Before 0.1.2 the single `gameplayRect` was fitted to the aspect of the saved layout.
  const legacy = (layout: 'split' | 'fill') => {
    const { fillRect, ...settings } = createDefaultSettings();
    return {
      ...settings,
      layout,
      gameplayRect: layout === 'fill' ? fillRect : settings.gameplayRect,
    };
  };

  it('keeps a legacy Fill crop as the fill rect and refits the split one', () => {
    const parsed = projectSettingsSchema.parse(legacy('fill'));
    expect(parsed.fillRect).toEqual(legacy('fill').gameplayRect);
    expect(parsed.gameplayRect).not.toEqual(parsed.fillRect);
    expect(parsed.gameplayRect.width / parsed.gameplayRect.height).toBeCloseTo(
      gameplayAspectFor('split', parsed.splitRatio, HD),
    );
  });

  it('derives a 9:16 fill rect from a legacy Split preset and leaves its crop alone', () => {
    const parsed = projectSettingsSchema.parse(legacy('split'));
    expect(parsed.gameplayRect).toEqual(legacy('split').gameplayRect);
    expect(parsed.fillRect.width / parsed.fillRect.height).toBeCloseTo(
      gameplayAspectFor('fill', parsed.splitRatio, HD),
    );
  });

  it('migrates presets in a file and leaves a modern fill rect untouched', () => {
    const { fillRect, ...settings } = createDefaultSettings();
    const preset = { ...settings, id: 'p', name: 'old', createdAt: 'x', updatedAt: 'x' };
    const file = migratePresetsFile({ version: 1, defaultPresetId: null, presets: [preset] });
    const migrated = file.presets[0]?.fillRect ?? { width: 0, height: 1 };
    expect(migrated.width / migrated.height).toBeCloseTo(
      gameplayAspectFor('fill', settings.splitRatio, HD),
    );
    expect(presetSchema.parse({ ...preset, fillRect }).fillRect).toEqual(fillRect);
  });
});
