import type { PresetsStore } from '../services/presets-store';

import { registerAppHandlers } from './app';
import { registerDialogHandlers } from './dialog';
import { registerExportHandlers } from './export';
import { registerFontHandlers } from './fonts';
import { registerPresetHandlers } from './presets';
import { registerSubtitleHandlers } from './subtitles';
import { registerVideoHandlers } from './video';

export function registerIpcHandlers(presets: PresetsStore): void {
  registerAppHandlers();
  registerDialogHandlers();
  registerVideoHandlers();
  registerPresetHandlers(presets);
  registerFontHandlers();
  registerSubtitleHandlers();
  registerExportHandlers();
}
