import { access } from 'node:fs/promises';

import { shell } from 'electron';

import { checkBinaries } from '../binaries';

import { handle } from './handle';

export function registerAppHandlers(): void {
  handle('app:checkBinaries', () => checkBinaries());

  handle('app:fileExists', async ({ path }) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });

  handle('app:showInFolder', ({ path }) => {
    shell.showItemInFolder(path);
  });
}
