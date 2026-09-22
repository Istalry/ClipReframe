import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { OutroPlacement, VideoInfo } from '../types';

import { fmt } from './format';
import { overlayStart } from './outro';

/**
 * What the scale-and-pad chain does with the outro's alpha:
 * - `keep` — leave it transparent, for the caller to composite over the clip;
 * - `flatten` — composite it over black, for an outro that carries alpha but is shown alone;
 * - `opaque` — the source has no alpha to begin with.
 */
type AlphaMode = 'keep' | 'flatten' | 'opaque';

/** Scale-and-pad chain shared by both placements. */
const fitChain = (fps: number, mode: AlphaMode): string => {
  const alpha = mode !== 'opaque';
  return [
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:flags=lanczos`,
    // The pixel format must carry alpha *before* padding, or the padding is opaque black.
    ...(alpha ? ['format=yuva420p'] : []),
    `pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2${alpha ? ':color=black@0' : ''}`,
    'setsar=1',
    `fps=${fmt(fps)}`,
    // Multiplying the colour planes by the frame's own alpha *is* compositing straight alpha over
    // black. Dropping the channel instead would paint the undefined colours a transparent video
    // carries where it is invisible.
    ...(mode === 'flatten' ? ['premultiply=inplace=1'] : []),
    ...(mode === 'keep' ? [] : ['format=yuv420p']),
  ].join(',');
};

/** Outro appended after the clip: its own video and audio, concatenated by the caller. */
export const appendedOutroChains = (fps: number, audio: string, hasAlpha: boolean): string[] => [
  `[1:v]${fitChain(fps, hasAlpha ? 'flatten' : 'opaque')}[vout]`,
  audio,
];

/**
 * Outro composited over the end of the clip. `overlay` plays the second input at its own
 * timestamps, so shifting them with `setpts` is enough to delay it; `eof_action=pass` lets the
 * clip continue alone if the outro ends first.
 */
export function overlayOutroChains(
  outro: VideoInfo,
  fps: number,
  clipDuration: number,
  audio: string | null,
): { video: string[]; audio: string[]; overlaid: string } {
  const start = overlayStart(clipDuration, outro.duration);
  const video = [
    `[1:v]${fitChain(fps, 'keep')},setpts=PTS-STARTPTS+${fmt(start)}/TB[vout]`,
    `[base][vout]overlay=eof_action=pass[ov]`,
  ];
  return {
    video,
    audio: audio
      ? [
          audio,
          `[aout]adelay=delays=${Math.round(start * 1000)}:all=1[aoutd]`,
          '[amain][aoutd]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]',
        ]
      : ['[amain]anull[a]'],
    overlaid: '[ov]',
  };
}

export const outroPlacement = (placement: OutroPlacement | undefined): OutroPlacement =>
  placement ?? 'after';
