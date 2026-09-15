/** H.264 encoders the bundled ffmpeg can drive; the GPU ones only work when the hardware is there. */
export const VIDEO_ENCODERS = ['libx264', 'h264_nvenc', 'h264_amf', 'h264_qsv'] as const;
export type VideoEncoder = (typeof VIDEO_ENCODERS)[number];

export const HARDWARE_ENCODERS: readonly VideoEncoder[] = ['h264_nvenc', 'h264_amf', 'h264_qsv'];

export const VIDEO_ENCODER_LABELS: Record<VideoEncoder, string> = {
  libx264: 'CPU (x264)',
  h264_nvenc: 'NVIDIA NVENC',
  h264_amf: 'AMD AMF',
  h264_qsv: 'Intel Quick Sync',
};

export const isVideoEncoder = (value: unknown): value is VideoEncoder =>
  typeof value === 'string' && (VIDEO_ENCODERS as readonly string[]).includes(value);

/**
 * Codec argv for one encoder, tuned to land near the x264 CRF 17 quality that 0.1.0 shipped
 * (constant-quality modes everywhere; GPU encoders need a slightly lower "quality" number to
 * match). Profile/level stay High 4.2 so the file is valid for TikTok and Shorts.
 */
export function encoderArgs(encoder: VideoEncoder): string[] {
  switch (encoder) {
    case 'libx264':
      return [
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
      ];
    case 'h264_nvenc':
      return [
        '-c:v',
        'h264_nvenc',
        '-preset',
        'p5',
        '-tune',
        'hq',
        '-rc',
        'vbr',
        '-cq',
        '19',
        '-b:v',
        '0',
        '-profile:v',
        'high',
        '-level',
        '4.2',
      ];
    case 'h264_amf':
      return [
        '-c:v',
        'h264_amf',
        '-quality',
        'quality',
        '-rc',
        'cqp',
        '-qp_i',
        '19',
        '-qp_p',
        '21',
        '-profile:v',
        'high',
        '-level',
        '4.2',
      ];
    case 'h264_qsv':
      return [
        '-c:v',
        'h264_qsv',
        '-preset',
        'slower',
        '-global_quality',
        '19',
        '-look_ahead',
        '1',
        '-profile:v',
        'high',
        '-level',
        '4.2',
      ];
  }
}

/**
 * The encoder to use for a preference: `auto` takes the first working GPU encoder in the
 * order the app prefers (NVENC, AMF, QSV) and falls back to x264.
 */
export function resolveEncoder(
  preference: 'auto' | 'cpu',
  available: readonly VideoEncoder[],
): VideoEncoder {
  if (preference === 'cpu') {
    return 'libx264';
  }
  return HARDWARE_ENCODERS.find((e) => available.includes(e)) ?? 'libx264';
}

/** Argv for a tiny encode that proves an encoder actually works on this machine. */
export function encoderProbeArgs(encoder: VideoEncoder): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:size=256x256:rate=30',
    '-frames:v',
    '2',
    ...encoderArgs(encoder),
    '-pix_fmt',
    'yuv420p',
    '-f',
    'null',
    '-',
  ];
}
