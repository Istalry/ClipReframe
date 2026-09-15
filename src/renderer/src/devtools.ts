import { useAppStore } from './store/app';
import { useJobStore } from './store/jobs';
import { usePlayerStore } from './store/player';
import { usePresetStore } from './store/presets';
import { useProjectStore } from './store/project';
import { useProxyStore } from './store/proxy';
import { useToastStore } from './store/toasts';

const stores = {
  app: useAppStore,
  project: useProjectStore,
  presets: usePresetStore,
  jobs: useJobStore,
  player: usePlayerStore,
  proxy: useProxyStore,
  toasts: useToastStore,
};

declare global {
  interface Window {
    /** Development only: lets DevTools / automation scripts drive the app. */
    __clipreframe?: typeof stores;
  }
}

/** Expose the Zustand stores on `window` in development builds only. */
export function installDevtools(): void {
  if (import.meta.env.DEV) {
    window.__clipreframe = stores;
  }
}
