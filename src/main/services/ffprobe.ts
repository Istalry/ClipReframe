import { basename } from 'node:path';

import { z } from 'zod';

import { AppError } from '@shared/errors';
import type { VideoInfo } from '@shared/types';

import { getBinaryPath } from '../binaries';

import { run } from './process';

const streamSchema = z.object({
  codec_type: z.string(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  r_frame_rate: z.string().optional(),
  avg_frame_rate: z.string().optional(),
  duration: z.string().optional(),
  tags: z.looseObject({ rotate: z.string().optional() }).optional(),
  side_data_list: z.array(z.looseObject({ rotation: z.number().optional() })).optional(),
});

const probeSchema = z.object({
  streams: z.array(streamSchema),
  format: z.looseObject({ duration: z.string().optional() }),
});

/** `30000/1001` → 29.97 */
export function parseFrameRate(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const [num, den] = value.split('/').map(Number);
  if (num === undefined || !Number.isFinite(num)) {
    return 0;
  }
  if (den === undefined || den === 0 || !Number.isFinite(den)) {
    return num;
  }
  return Math.round((num / den) * 1000) / 1000;
}

/** Pure conversion from ffprobe JSON to VideoInfo, exported for tests. */
export function toVideoInfo(path: string, raw: unknown): VideoInfo {
  const parsed = probeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError('PROBE_FAILED', 'Unexpected ffprobe output', parsed.error.message);
  }
  const video = parsed.data.streams.find((s) => s.codec_type === 'video');
  if (!video?.width || !video.height) {
    throw new AppError('UNSUPPORTED_MEDIA', 'No video stream found in this file');
  }
  const hasAudio = parsed.data.streams.some((s) => s.codec_type === 'audio');
  const duration = Number(parsed.data.format.duration ?? video.duration ?? 0);

  // Phone footage often stores a rotation instead of rotated pixels; swap dimensions to match.
  const rotation =
    video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ??
    Number(video.tags?.rotate ?? 0);
  const rotated = Math.abs(rotation % 180) === 90;

  return {
    path,
    fileName: basename(path),
    width: rotated ? video.height : video.width,
    height: rotated ? video.width : video.height,
    duration: Number.isFinite(duration) ? duration : 0,
    fps: parseFrameRate(video.avg_frame_rate) || parseFrameRate(video.r_frame_rate),
    videoCodec: video.codec_name ?? 'unknown',
    hasAudio,
  };
}

export async function probeVideo(path: string): Promise<VideoInfo> {
  const { stdout } = await run(
    getBinaryPath('ffprobe'),
    [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_entries',
      'format=duration',
      path,
    ],
    { failureCode: 'PROBE_FAILED', cancelCode: 'PROBE_FAILED' },
  );
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    throw new AppError('PROBE_FAILED', 'ffprobe returned invalid JSON');
  }
  return toVideoInfo(path, json);
}
