import type { OutroLibrary } from '../services/outro-library';

import { handle } from './handle';

export function registerOutroHandlers(library: OutroLibrary): void {
  handle('outro:import', async ({ path }) => ({ path: await library.import(path) }));
}
