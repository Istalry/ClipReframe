import {
  buildDetectCutsArgs,
  CUT_THRESHOLDS,
  parseSceneChanges,
  parseSceneChangeLine,
} from './detect';

describe('buildDetectCutsArgs', () => {
  it('analyses a downscaled copy at info level with no output file', () => {
    const args = buildDetectCutsArgs('C:\\clips\\my clip.mp4', CUT_THRESHOLDS.high);
    expect(args).toEqual(
      expect.arrayContaining(['-loglevel', 'info', '-i', 'C:\\clips\\my clip.mp4']),
    );
    expect(args).toContain(`scale=320:-2,scdet=threshold=${CUT_THRESHOLDS.high}`);
    expect(args.slice(-3)).toEqual(['-f', 'null', '-']);
  });
});

describe('parseSceneChangeLine', () => {
  it('reads the time scdet logs', () => {
    expect(
      parseSceneChangeLine(
        '[Parsed_scdet_1 @ 000001b95e3cc5c0] lavfi.scd.score: 15.625, lavfi.scd.time: 12.666667',
      ),
    ).toBe(12.666667);
    expect(parseSceneChangeLine('[Parsed_scdet_1 @ 0x1] lavfi.scd.time: 1')).toBe(1);
  });

  it('ignores every other line', () => {
    expect(parseSceneChangeLine('frame=  120 fps=0.0 q=-1.0')).toBeNull();
    expect(parseSceneChangeLine('lavfi.scd.score: 15.625')).toBeNull();
  });
});

describe('parseSceneChanges', () => {
  it('sorts and de-duplicates', () => {
    expect(
      parseSceneChanges([
        'x lavfi.scd.time: 12.5',
        'noise',
        'x lavfi.scd.time: 3',
        'x lavfi.scd.time: 12.5',
      ]),
    ).toEqual([3, 12.5]);
  });
});
