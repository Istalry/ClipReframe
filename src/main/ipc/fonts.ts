import { listSystemFonts } from '../services/fonts';

import { handle } from './handle';

export function registerFontHandlers(): void {
  handle('fonts:list', () => listSystemFonts());
}
