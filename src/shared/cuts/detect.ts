/** How eager cut detection is; the values are scdet's 0..100 difference score. */
export const CUT_SENSITIVITIES = ['low', 'medium', 'high'] as const;
export type CutSensitivity = (typeof CUT_SENSITIVITIES)[number];

/**
 * Calibrated on gameplay footage: a real cut between two scenes of the same game scores ~5,
 * while motion inside a scene stays under ~1 (a big in-game transition can reach ~4.7).
 */
export const CUT_THRESHOLDS: Record<CutSensitivity, number> = { low: 8, medium: 4.5, high: 2.5 };

export const DEFAULT_CUT_SENSITIVITY: CutSensitivity = 'medium';

/**
 * scdet only logs at info level, hence the louder `-loglevel`; the analysis runs on a 320 px
 * copy, which is plenty to spot a scene change and much faster than full resolution.
 */
export function buildDetectCutsArgs(path: string, threshold: number): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'info',
    '-nostats',
    '-progress',
    'pipe:1',
    '-i',
    path,
    '-an',
    '-sn',
    '-dn',
    '-vf',
    `scale=320:-2,scdet=threshold=${threshold}`,
    '-f',
    'null',
    '-',
  ];
}

/** `[Parsed_scdet_1 @ …] lavfi.scd.score: 15.625, lavfi.scd.time: 12.666667` → `12.666667`. */
export function parseSceneChangeLine(line: string): number | null {
  const m = /lavfi\.scd\.time:\s*(\d+(?:\.\d+)?)/.exec(line);
  return m?.[1] === undefined ? null : Number(m[1]);
}

export function parseSceneChanges(lines: readonly string[]): number[] {
  const times = new Set<number>();
  for (const line of lines) {
    const time = parseSceneChangeLine(line);
    if (time !== null) {
      times.add(time);
    }
  }
  return [...times].sort((a, b) => a - b);
}
