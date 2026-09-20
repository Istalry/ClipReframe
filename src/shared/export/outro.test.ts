import { containRect, overlayStart, overlayWindow } from './outro';
import { buildOutroPreviewArgs } from './outro-preview';

describe('overlayStart', () => {
  it('ends the outro with the clip', () => {
    expect(overlayStart(30, 6)).toBe(24);
  });

  it('starts at zero when the outro is longer than the clip', () => {
    expect(overlayStart(3, 6)).toBe(0);
  });
});

describe('overlayWindow', () => {
  it('covers the end of the untrimmed clip', () => {
    expect(overlayWindow(42, 6, null)).toEqual({ start: 36, end: 42 });
  });

  it('follows the trim', () => {
    expect(overlayWindow(42, 6, { start: 10, end: 20 })).toEqual({ start: 14, end: 20 });
  });

  it('covers the whole trimmed range when the outro is longer', () => {
    expect(overlayWindow(42, 30, { start: 10, end: 20 })).toEqual({ start: 10, end: 20 });
  });
});

describe('containRect', () => {
  it('fills a 9:16 source exactly', () => {
    expect(containRect({ width: 2160, height: 3840 })).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
    });
  });

  it('letterboxes a 16:9 source centred', () => {
    expect(containRect({ width: 1920, height: 1080 })).toEqual({
      x: 0,
      y: 656,
      width: 1080,
      height: 608,
    });
  });

  it('falls back to the whole canvas for an unknown size', () => {
    expect(containRect({ width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
    });
  });
});

describe('buildOutroPreviewArgs', () => {
  const outro = {
    path: 'D:\\Stream\\vertical.mov',
    fileName: 'vertical.mov',
    width: 2160,
    height: 3840,
    duration: 6,
    fps: 60,
    videoCodec: 'prores',
    audioTracks: [],
  };

  it('encodes VP9 with alpha and no audio', () => {
    const args = buildOutroPreviewArgs(outro, 'C:\\out\\cta.webm');
    expect(args).toEqual(expect.arrayContaining(['-i', outro.path, '-an']));
    expect(args.join(' ')).toContain('format=yuva420p');
    expect(args.join(' ')).toContain('-c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0');
    expect(args.slice(-3)).toEqual(['-f', 'webm', 'C:\\out\\cta.webm']);
  });
});
