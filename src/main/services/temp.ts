import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { app } from 'electron';

/** Per-job scratch directory under the app's own temp folder, removed by `dispose`. */
export interface TempDir {
  path: string;
  dispose(): Promise<void>;
}

export async function createTempDir(prefix: string): Promise<TempDir> {
  const path = await mkdtemp(join(app.getPath('temp'), `clipreframe-${prefix}-`));
  return {
    path,
    dispose: () => rm(path, { recursive: true, force: true }),
  };
}
