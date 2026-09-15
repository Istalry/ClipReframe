import { createDefaultSettings } from '../presets/schema';
import type { VideoInfo } from '../types';

import {
  buildExportArgs,
  buildFilterComplex,
  escapeFilterPath,
  parseProgressBlock,
  pickOutputFps,
  totalOutputDuration,
  type ExportArgsInput,
} from './filtergraph';

const source: VideoInfo = {
  path: 'C:\\clips\\my clip.mp4',
  fileName: 'my clip.mp4',
  width: 1920,
  height: 1080,
  duration: 42,
  fps: 60,
  videoCodec: 'h264',
  hasAudio: true,
};

const outro: VideoInfo = {
  path: 'C:\\clips\\cta.mp4',
  fileName: 'cta.mp4',
  width: 1080,
  height: 1920,
  duration: 3,
  fps: 30,
  videoCodec: 'h264',
  hasAudio: false,
};

const base = (): ExportArgsInput => ({
  source,
  settings: createDefaultSettings(),
  outro: null,
  subtitlesFile: null,
  fontsDir: 'C:\\Windows\\Fonts',
  outputPath: 'D:\\out\\my clip_vertical.mp4',
});

describe('escapeFilterPath', () => {
  it('uses forward slashes and escapes colons', () => {
    expect(escapeFilterPath('C:\\Windows\\Fonts')).toBe('C\\:/Windows/Fonts');
  });

  it('handles accents and spaces untouched', () => {
    expect(escapeFilterPath('C:\\Users\\Jérôme B\\x')).toBe('C\\:/Users/Jérôme B/x');
  });
});

describe('pickOutputFps', () => {
  it('caps at 60 and falls back to 30', () => {
    expect(pickOutputFps(120)).toBe(60);
    expect(pickOutputFps(29.97)).toBe(29.97);
    expect(pickOutputFps(0)).toBe(30);
    expect(pickOutputFps(Number.NaN)).toBe(30);
  });
});

describe('buildFilterComplex', () => {
  it('split layout crops twice, stacks, and ends in [v]/[a]', () => {
    const fc = buildFilterComplex(base());
    expect(fc).toMatch(/\[0:v\]crop=\d+:\d+:\d+:\d+,scale=1080:\d+:flags=lanczos,setsar=1\[top\]/);
    expect(fc).toContain('[bot]');
    expect(fc).toContain('[top][bot]vstack=inputs=2[stacked]');
    expect(fc).toContain('[stacked]fps=60,format=yuv420p[vmain]');
    expect(fc).toContain('[0:a]aformat=');
    expect(fc).toContain('[vmain]null[v]');
    expect(fc).toContain('[amain]anull[a]');
    expect(fc).not.toContain('subtitles=');
  });

  it('crop dimensions are even', () => {
    const fc = buildFilterComplex(base());
    for (const m of fc.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)) {
      for (const v of m.slice(1, 5)) {
        expect(Number(v) % 2).toBe(0);
      }
    }
  });

  it('fill layout produces a single 1080x1920 scale', () => {
    const input = base();
    input.settings = { ...input.settings, layout: 'fill' };
    const fc = buildFilterComplex(input);
    expect(fc).not.toContain('vstack');
    expect(fc).toContain('scale=1080:1920:flags=lanczos');
  });

  it('adds the subtitles filter after scaling with an escaped fontsdir', () => {
    const fc = buildFilterComplex({ ...base(), subtitlesFile: 'subs.ass' });
    expect(fc).toContain("format=yuv420p,subtitles=subs.ass:fontsdir='C\\:/Windows/Fonts'[vmain]");
  });

  it('with an outro, normalises it and concatenates; silent outro gets anullsrc', () => {
    const fc = buildFilterComplex({ ...base(), outro });
    expect(fc).toContain('[1:v]scale=1080:1920:force_original_aspect_ratio=decrease');
    expect(fc).toContain('pad=1080:1920:(ow-iw)/2:(oh-ih)/2');
    expect(fc).toContain('anullsrc=r=48000:cl=stereo:d=3[aout]');
    expect(fc).toContain('[vmain][amain][vout][aout]concat=n=2:v=1:a=1[v][a]');
  });

  it('silent source gets a generated audio track', () => {
    const fc = buildFilterComplex({ ...base(), source: { ...source, hasAudio: false } });
    expect(fc).toContain('anullsrc=r=48000:cl=stereo:d=42[amain]');
  });
});

describe('buildExportArgs', () => {
  it('produces a compliant encode command', () => {
    const args = buildExportArgs({ ...base(), outro });
    expect(args.slice(0, 2)).toEqual(['-hide_banner', '-loglevel']);
    expect(args).toContain('-progress');
    expect(args.filter((a) => a === '-i')).toHaveLength(2);
    expect(args[args.indexOf('-i') + 1]).toBe(source.path);
    expect(args).toEqual(
      expect.arrayContaining(['libx264', '-crf', '17', 'high', 'yuv420p', 'aac', '+faststart']),
    );
    expect(args[args.length - 1]).toBe('D:\\out\\my clip_vertical.mp4');
  });
});

describe('totalOutputDuration', () => {
  it('sums source and outro', () => {
    expect(totalOutputDuration(source, null)).toBe(42);
    expect(totalOutputDuration(source, outro)).toBe(45);
  });
});

describe('parseProgressBlock', () => {
  it('reads out_time_us and speed', () => {
    const block =
      'frame=100\nfps=50\nout_time_us=12500000\nout_time=00:00:12.5\nspeed=1.5x\nprogress=continue';
    expect(parseProgressBlock(block)).toEqual({ outTime: 12.5, speed: '1.5x' });
  });

  it('returns null when no time is present', () => {
    expect(parseProgressBlock('frame=1\nprogress=continue')).toBeNull();
  });

  it('clamps negative sentinel values', () => {
    expect(parseProgressBlock('out_time_us=-9223372036854775808')?.outTime).toBe(0);
  });
});
