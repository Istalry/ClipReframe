import type { VideoInfo } from '../types';

import { proxyEncoderArgs, type VideoEncoder } from './encoders';

/** Longest edge of the proxy; plenty for framing and far cheaper to decode than the source. */
export const PROXY_MAX_HEIGHT = 720;

/**
 * ffmpeg argv for a preview proxy: 8-bit H.264 at up to 720p, the default audio track as AAC,
 * progress on stdout like the export. Only the preview reads it — export, transcription and the
 * audio mix keep using the original.
 */
export function buildProxyArgs(
  source: VideoInfo,
  encoder: VideoEncoder,
  outputPath: string,
): string[] {
  const filters = ['format=yuv420p'];
  if (source.height > PROXY_MAX_HEIGHT) {
    // Even width keeps yuv420p happy whatever the source aspect.
    filters.unshift(`scale=-2:${PROXY_MAX_HEIGHT}`);
  }
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostats',
    '-progress',
    'pipe:1',
    '-y',
    '-i',
    source.path,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    filters.join(','),
    ...proxyEncoderArgs(encoder),
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}
