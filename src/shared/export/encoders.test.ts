import { encoderArgs, encoderProbeArgs, isVideoEncoder, resolveEncoder } from './encoders';

describe('encoderArgs', () => {
  it('keeps the 0.1.0 x264 settings', () => {
    expect(encoderArgs('libx264')).toEqual([
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '17',
      '-profile:v',
      'high',
      '-level',
      '4.2',
    ]);
  });

  it('uses constant-quality modes and the High profile for every GPU encoder', () => {
    for (const encoder of ['h264_nvenc', 'h264_amf', 'h264_qsv'] as const) {
      const args = encoderArgs(encoder);
      expect(args.slice(0, 2)).toEqual(['-c:v', encoder]);
      expect(args).toEqual(expect.arrayContaining(['-profile:v', 'high', '-level', '4.2']));
      expect(args).not.toContain('-crf');
    }
  });
});

describe('resolveEncoder', () => {
  it('prefers NVENC, then AMF, then QSV, then x264', () => {
    expect(resolveEncoder('auto', ['h264_qsv', 'h264_amf', 'h264_nvenc'])).toBe('h264_nvenc');
    expect(resolveEncoder('auto', ['h264_qsv', 'h264_amf'])).toBe('h264_amf');
    expect(resolveEncoder('auto', [])).toBe('libx264');
  });

  it('honours the CPU preference regardless of hardware', () => {
    expect(resolveEncoder('cpu', ['h264_nvenc'])).toBe('libx264');
  });
});

describe('encoderProbeArgs', () => {
  it('encodes two synthetic frames to the null muxer', () => {
    const args = encoderProbeArgs('h264_amf');
    expect(args).toEqual(
      expect.arrayContaining(['-f', 'lavfi', '-frames:v', '2', 'h264_amf', 'null']),
    );
  });
});

describe('isVideoEncoder', () => {
  it('narrows strings', () => {
    expect(isVideoEncoder('h264_nvenc')).toBe(true);
    expect(isVideoEncoder('libx265')).toBe(false);
    expect(isVideoEncoder(3)).toBe(false);
  });
});
