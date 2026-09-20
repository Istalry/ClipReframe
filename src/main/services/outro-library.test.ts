import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OutroLibrary } from './outro-library';

let root: string;
let library: OutroLibrary;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'clipreframe-outros-'));
  library = new OutroLibrary(join(root, 'outros'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('OutroLibrary', () => {
  it('copies the file under a content-hash name and reuses it on re-import', async () => {
    const source = join(root, 'cta é.mp4');
    await writeFile(source, 'video bytes');
    const stored = await library.import(source);
    expect(stored).toMatch(/outros[\\/][0-9a-f]{12}-cta é\.mp4$/);
    expect(await readFile(stored, 'utf8')).toBe('video bytes');

    const again = await library.import(source);
    expect(again).toBe(stored);
    expect(await readdir(join(root, 'outros'))).toHaveLength(1);
  });

  it('replaces a copy whose size does not match (interrupted copy)', async () => {
    const source = join(root, 'a.mp4');
    await writeFile(source, 'complete content');
    const stored = await library.import(source);
    await writeFile(stored, 'compl');
    expect(await library.import(source)).toBe(stored);
    expect(await readFile(stored, 'utf8')).toBe('complete content');
  });

  it('returns managed paths untouched', async () => {
    const source = join(root, 'a.mp4');
    await writeFile(source, 'x');
    const stored = await library.import(source);
    expect(library.isManaged(stored)).toBe(true);
    expect(library.isManaged(source)).toBe(false);
    expect(await library.import(stored)).toBe(stored);
  });

  it('rejects a missing source with FILE_NOT_FOUND', async () => {
    await expect(library.import(join(root, 'nope.mp4'))).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    });
  });

  it('prunes copies nothing references, case-insensitively', async () => {
    const a = join(root, 'a.mp4');
    const b = join(root, 'b.mp4');
    await writeFile(a, 'aaa');
    await writeFile(b, 'bbb');
    const storedA = await library.import(a);
    await library.import(b);
    await library.prune([storedA.toUpperCase(), null, undefined]);
    expect(await readdir(join(root, 'outros'))).toEqual([storedA.split(/[\\/]/).pop()]);
  });

  it('names the preview copy after the library file, and only for managed paths', async () => {
    const source = join(root, 'a.mp4');
    await writeFile(source, 'aaa');
    const stored = await library.import(source);
    expect(library.previewPath(stored)).toBe(`${stored}.preview.webm`);
    expect(library.previewPath(source)).toBeNull();
  });

  it('keeps the preview of a referenced copy and removes orphan previews', async () => {
    const a = join(root, 'a.mp4');
    const b = join(root, 'b.mp4');
    await writeFile(a, 'aaa');
    await writeFile(b, 'bbb');
    const storedA = await library.import(a);
    const storedB = await library.import(b);
    await writeFile(`${storedA}.preview.webm`, 'webm');
    await writeFile(`${storedB}.preview.webm`, 'webm');
    await writeFile(`${storedA}.preview.webm.partial`, 'half');

    await library.prune([storedA]);
    expect((await readdir(join(root, 'outros'))).sort()).toEqual(
      [storedA, `${storedA}.preview.webm`].map((p) => p.split(/[\\/]/).pop()).sort(),
    );
  });

  it('prune is a no-op before anything was imported', async () => {
    await expect(library.prune([])).resolves.toBeUndefined();
  });
});
