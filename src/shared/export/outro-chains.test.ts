import { describe, expect, it } from 'vitest';

import type { VideoInfo } from '../types';

import { appendedOutroChains, outroPlacement, overlayOutroChains } from './outro-chains';

const FIT =
  'scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,' +
  'pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p';

const outro = (pixelFormat: string): VideoInfo => ({
  path: 'C:/outros/card.mov',
  fileName: 'card.mov',
  width: 1080,
  height: 1920,
  duration: 6,
  fps: 60,
  videoCodec: 'prores',
  pixelFormat,
  audioTracks: [],
});

describe('appendedOutroChains', () => {
  it('leaves an opaque outro on the chain 0.1.2 shipped', () => {
    expect(appendedOutroChains(30, '[aout]anull[aout]', false)).toEqual([
      `[1:v]${FIT}[vout]`,
      '[aout]anull[aout]',
    ]);
  });

  it('composites a transparent outro over black instead of dropping its alpha', () => {
    const [video] = appendedOutroChains(30, '[aout]anull[aout]', true);
    expect(video).toBe(
      '[1:v]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,format=yuva420p,' +
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1,fps=30,' +
        'premultiply=inplace=1,format=yuv420p[vout]',
    );
  });

  it('flattens after padding, so the letterbox bars stay black', () => {
    const [video = ''] = appendedOutroChains(30, '', true);
    expect(video.indexOf('pad=')).toBeLessThan(video.indexOf('premultiply'));
    expect(video.indexOf('premultiply')).toBeLessThan(video.lastIndexOf('format=yuv420p'));
  });
});

describe('overlayOutroChains', () => {
  it('keeps the alpha, since the clip underneath is what shows through', () => {
    const { video } = overlayOutroChains(outro('yuva444p12le'), 30, 20, null);
    expect(video[0]).toBe(
      '[1:v]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,format=yuva420p,' +
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1,fps=30,' +
        'setpts=PTS-STARTPTS+14/TB[vout]',
    );
    expect(video[0]).not.toContain('premultiply');
  });
});

describe('outroPlacement', () => {
  it('defaults to appending, the behaviour presets without a mode were saved with', () => {
    expect(outroPlacement(undefined)).toBe('after');
    expect(outroPlacement('overlay')).toBe('overlay');
  });
});
