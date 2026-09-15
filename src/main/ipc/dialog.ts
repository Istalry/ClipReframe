import { BrowserWindow, dialog, type OpenDialogOptions, type WebContents } from 'electron';

import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants';

import { handle } from './handle';

const VIDEO_FILTER = {
  name: 'Video',
  extensions: SUPPORTED_VIDEO_EXTENSIONS.map((e) => e.slice(1)),
};

/** Modal to the calling window when it still exists, otherwise app-level. */
async function pick(sender: WebContents, options: OpenDialogOptions): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(sender);
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

export function registerDialogHandlers(): void {
  handle('dialog:openVideo', ({ title }, event) =>
    pick(event.sender, { title, properties: ['openFile'], filters: [VIDEO_FILTER] }),
  );

  handle('dialog:chooseFolder', ({ defaultPath }, event) =>
    pick(event.sender, {
      title: 'Choose export folder',
      properties: ['openDirectory', 'createDirectory'],
      ...(defaultPath ? { defaultPath } : {}),
    }),
  );
}
