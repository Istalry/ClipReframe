import type { SubtitleCue } from '../types';

/** The cue displayed at `time`, if any. Cues are expected to be non-overlapping. */
export function findActiveCue(cues: SubtitleCue[], time: number): SubtitleCue | undefined {
  return cues.find((c) => time >= c.start && time < c.end);
}
