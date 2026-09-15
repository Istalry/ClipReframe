import type { VideoInfo } from '../types';

import { buildProxyArgs } from './proxy';

const source: VideoInfo = {
  path: 'C:\\clips\\hdr.mkv',
  fileName: 'hdr.mkv',
  width: 3840,
  height: 2160,
  duration: 10,
  fps: 60,
  videoCodec: 'hevc',
  pixelFormat: 'yuv420p10le',
  audioTracks: [],
};

describe('buildProxyArgs', () => {
  it('downscales to 720p, forces 8-bit 4:2:0 and keeps only the default audio track', () => {
    const args = buildProxyArgs(source, 'libx264', 'D:\\tmp\\proxy.mp4');
    expect(args[args.indexOf('-vf') + 1]).toBe('scale=-2:720,format=yuv420p');
    expect(args).toEqual(
      expect.arrayContaining([
        '-map',
        '0:v:0',
        '0:a:0?',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        'aac',
      ]),
    );
    expect(args[args.length - 1]).toBe('D:\\tmp\\proxy.mp4');
  });

  it('does not upscale small sources and uses the GPU encoder when given', () => {
    const args = buildProxyArgs({ ...source, height: 480, width: 854 }, 'h264_nvenc', 'p.mp4');
    expect(args[args.indexOf('-vf') + 1]).toBe('format=yuv420p');
    expect(args).toContain('h264_nvenc');
  });
});
