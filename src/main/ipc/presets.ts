import type { PresetsStore } from '../services/presets-store';

import { handle } from './handle';

export function registerPresetHandlers(store: PresetsStore): void {
  handle('presets:list', () => store.load());
  handle('presets:save', (input) => store.save(input));
  handle('presets:delete', ({ id }) => store.delete(id));
  handle('presets:setDefault', ({ id }) => store.setDefault(id));
}
