import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }));

import { parseRange, serveFile } from './media-protocol';

describe('parseRange', () => {
  it('parses open, closed and suffix ranges', () => {
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 });
    expect(parseRange('bytes=10-500', 100)).toEqual({ start: 10, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
  });

  it('rejects missing, malformed and unsatisfiable ranges', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('items=0-1', 100)).toBeNull();
    expect(parseRange('bytes=-', 100)).toBeNull();
    expect(parseRange('bytes=100-', 100)).toBeNull();
    expect(parseRange('bytes=20-10', 100)).toBeNull();
  });
});

describe('serveFile', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'clipreframe-media-'));
    file = join(dir, 'clip.mp4');
    await writeFile(file, Buffer.from('0123456789'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('serves the whole file with 200', async () => {
    const res = await serveFile(file, null);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(await res.text()).toBe('0123456789');
  });

  it('serves a partial range with 206 and Content-Range', async () => {
    const res = await serveFile(file, 'bytes=2-4');
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 2-4/10');
    expect(res.headers.get('Content-Length')).toBe('3');
    expect(await res.text()).toBe('234');
  });

  it('rejects a missing file', async () => {
    await expect(serveFile(join(dir, 'missing.mp4'), null)).rejects.toThrow();
  });
});
