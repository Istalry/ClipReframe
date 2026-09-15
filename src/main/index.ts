import { join } from 'node:path';

import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, shell } from 'electron';

import { registerIpcHandlers } from './ipc';
import { createLogger } from './logger';
import { registerMediaProtocolHandler, registerMediaSchemePrivileges } from './media-protocol';
import { detectHardwareEncoders } from './services/encoders';
import { jobs } from './services/jobs';
import { OutroLibrary } from './services/outro-library';
import { PresetsStore } from './services/presets-store';
import { disposePreviewAudio } from './services/preview-audio';
import { disposeProxy } from './services/proxy';

const log = createLogger('main');

registerMediaSchemePrivileges();

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f12',
    title: 'ClipReframe',
    webPreferences: {
      // Built as CommonJS (.cjs) because sandboxed preload scripts cannot be ES modules.
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  // A dropped file must never navigate the window away from the app.
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Any external link opens in the default browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.j2studio.clipreframe');
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerMediaProtocolHandler();
  const presets = PresetsStore.forUserData(app.getPath('userData'));
  const outros = OutroLibrary.forUserData(app.getPath('userData'));
  registerIpcHandlers(presets, outros);
  // Drop outro copies that no preset references any more (a deleted preset's outro, typically).
  void presets
    .load()
    .then((file) => outros.prune(file.presets.map((p) => p.outro?.path)))
    .catch((err: unknown) => {
      log.warn('outro clean-up skipped', err);
    });
  createWindow();
  // Warm the GPU encoder probe so the first export does not wait for it.
  void detectHardwareEncoders();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  log.info('ready');
});

app.on('before-quit', () => {
  // Kill any ffmpeg/whisper still running so we never leave orphans behind.
  jobs.cancelAll();
  void disposePreviewAudio();
  void disposeProxy();
});

app.on('window-all-closed', () => {
  app.quit();
});
