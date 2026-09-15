vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => 'C:\\app' } }));

import { parseFrameRate, toVideoInfo } from './ffprobe';

describe('parseFrameRate', () => {
  it('handles fractions and integers', () => {
    expect(parseFrameRate('30000/1001')).toBe(29.97);
    expect(parseFrameRate('60/1')).toBe(60);
    expect(parseFrameRate('0/0')).toBe(0);
    expect(parseFrameRate(undefined)).toBe(0);
  });
});

describe('toVideoInfo', () => {
  const raw = {
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: 1920,
        height: 1080,
        avg_frame_rate: '60/1',
      },
      { codec_type: 'audio', codec_name: 'aac' },
    ],
    format: { duration: '42.5' },
  };

  it('maps a standard clip', () => {
    expect(toVideoInfo('C:\\clips\\a.mp4', raw)).toEqual({
      path: 'C:\\clips\\a.mp4',
      fileName: 'a.mp4',
      width: 1920,
      height: 1080,
      duration: 42.5,
      fps: 60,
      videoCodec: 'h264',
      hasAudio: true,
    });
  });

  it('swaps dimensions for rotated footage', () => {
    const rotated = {
      ...raw,
      streams: [{ ...raw.streams[0], side_data_list: [{ rotation: -90 }] }],
    };
    const info = toVideoInfo('x.mp4', rotated);
    expect(info.width).toBe(1080);
    expect(info.height).toBe(1920);
    expect(info.hasAudio).toBe(false);
  });

  it('rejects files without video', () => {
    expect(() => toVideoInfo('x.mp3', { streams: [{ codec_type: 'audio' }], format: {} })).toThrow(
      /No video stream/,
    );
  });
});
