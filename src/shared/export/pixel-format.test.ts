import { describe, expect, it } from 'vitest';

import { hasAlphaChannel } from './pixel-format';

describe('hasAlphaChannel', () => {
  it.each(['yuva420p', 'yuva444p12le', 'rgba', 'bgra', 'argb', 'abgr', 'ya8', 'gbrap10le', 'pal8'])(
    'reports %s as carrying alpha',
    (format) => {
      expect(hasAlphaChannel(format)).toBe(true);
    },
  );

  it.each(['yuv420p', 'yuv420p10le', 'yuv444p', 'rgb24', 'gbrp', 'nv12', 'gray'])(
    'reports %s as opaque',
    (format) => {
      expect(hasAlphaChannel(format)).toBe(false);
    },
  );

  it('treats an unknown pixel format as opaque', () => {
    expect(hasAlphaChannel(undefined)).toBe(false);
    expect(hasAlphaChannel('')).toBe(false);
  });

  it('ignores case, since ffprobe spelling is not guaranteed', () => {
    expect(hasAlphaChannel('YUVA420P')).toBe(true);
  });
});
