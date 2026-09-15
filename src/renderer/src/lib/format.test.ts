import { defaultOutputName, formatTime, outroDisplayName } from './format';

describe('formatTime', () => {
  it('formats minutes and tenths', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(83.46)).toBe('1:23.5');
    expect(formatTime(-2)).toBe('0:00.0');
  });
});

describe('defaultOutputName', () => {
  it('replaces the extension', () => {
    expect(defaultOutputName('my clip.mp4')).toBe('my clip_vertical.mp4');
    expect(defaultOutputName('archive.tar.mkv')).toBe('archive.tar_vertical.mp4');
    expect(defaultOutputName('noext')).toBe('noext_vertical.mp4');
  });
});

describe('outroDisplayName', () => {
  it('drops the library hash prefix and leaves other names alone', () => {
    expect(outroDisplayName('f6c0769eef3a-cta final.mp4')).toBe('cta final.mp4');
    expect(outroDisplayName('cta final.mp4')).toBe('cta final.mp4');
  });
});
