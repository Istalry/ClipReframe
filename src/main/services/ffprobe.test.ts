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
      { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '48000' },
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
      audioTracks: [{ index: 0, codec: 'aac', channels: 2, sampleRate: 48000, label: null }],
    });
  });

  it('lists every audio track with an audio-relative index and its label', () => {
    const multi = {
      ...raw,
      streams: [
        { codec_type: 'audio', codec_name: 'aac', channels: 2, tags: { title: 'Mic' } },
        raw.streams[0],
        { codec_type: 'subtitle' },
        { codec_type: 'audio', codec_name: 'opus', channels: 1, tags: { language: 'fra' } },
        { codec_type: 'audio' },
      ],
    };
    expect(toVideoInfo('x.mkv', multi).audioTracks).toEqual([
      { index: 0, codec: 'aac', channels: 2, sampleRate: 0, label: 'Mic' },
      { index: 1, codec: 'opus', channels: 1, sampleRate: 0, label: 'fra' },
      { index: 2, codec: 'unknown', channels: 0, sampleRate: 0, label: null },
    ]);
  });

  it('swaps dimensions for rotated footage', () => {
    const rotated = {
      ...raw,
      streams: [{ ...raw.streams[0], side_data_list: [{ rotation: -90 }] }],
    };
    const info = toVideoInfo('x.mp4', rotated);
    expect(info.width).toBe(1080);
    expect(info.height).toBe(1920);
    expect(info.audioTracks).toEqual([]);
  });

  it('rejects files without video', () => {
    expect(() => toVideoInfo('x.mp3', { streams: [{ codec_type: 'audio' }], format: {} })).toThrow(
      /No video stream/,
    );
  });
});
