import type { OutroLibrary } from '../services/outro-library';
import type { PresetsStore } from '../services/presets-store';

import { registerAppHandlers } from './app';
import { registerDialogHandlers } from './dialog';
import { registerExportHandlers } from './export';
import { registerFontHandlers } from './fonts';
import { registerOutroHandlers } from './outro';
import { registerPresetHandlers } from './presets';
import { registerSubtitleHandlers } from './subtitles';
import { registerVideoHandlers } from './video';

export function registerIpcHandlers(presets: PresetsStore, outros: OutroLibrary): void {
  registerAppHandlers();
  registerDialogHandlers();
  registerVideoHandlers();
  registerPresetHandlers(presets);
  registerOutroHandlers(outros);
  registerFontHandlers();
  registerSubtitleHandlers();
  registerExportHandlers();
}
