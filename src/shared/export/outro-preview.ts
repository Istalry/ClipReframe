import type { VideoInfo } from '../types';

/** Height of the preview copy; the browser only has to composite it over a small canvas. */
export const OUTRO_PREVIEW_HEIGHT = 960;

/**
 * Transcode an outro into a WebM the built-in player can decode **with its alpha channel**
 * (VP9 is the only such codec in Chromium; `-auto-alt-ref 0` is required for alpha). Audio is
 * dropped: the preview mixes the clip's own audio only.
 */
export function buildOutroPreviewArgs(outro: VideoInfo, outputPath: string): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostats',
    '-progress',
    'pipe:1',
    '-y',
    '-i',
    outro.path,
    '-map',
    '0:v:0',
    '-an',
    '-vf',
    `scale=-2:${OUTRO_PREVIEW_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,format=yuva420p`,
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuva420p',
    '-auto-alt-ref',
    '0',
    '-b:v',
    '0',
    '-crf',
    '30',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    '-row-mt',
    '1',
    '-f',
    'webm',
    outputPath,
  ];
}
