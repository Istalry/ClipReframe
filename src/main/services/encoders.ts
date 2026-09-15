import { encoderProbeArgs, HARDWARE_ENCODERS, type VideoEncoder } from '@shared/export/encoders';

import { getBinaryPath } from '../binaries';
import { createLogger } from '../logger';

import { run } from './process';

const log = createLogger('encoders');

/** A probe that hangs (driver stuck) must not block exports forever. */
const PROBE_TIMEOUT_MS = 15_000;

let detection: Promise<VideoEncoder[]> | null = null;

async function probe(encoder: VideoEncoder): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, PROBE_TIMEOUT_MS);
  try {
    await run(getBinaryPath('ffmpeg'), encoderProbeArgs(encoder), {
      signal: controller.signal,
      failureCode: 'EXPORT_FAILED',
      cancelCode: 'EXPORT_CANCELLED',
    });
    return true;
  } catch (err) {
    log.info(`${encoder} unavailable: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GPU encoders that really work on this machine. ffmpeg lists every encoder it was built with,
 * so only a tiny test encode tells whether the driver/hardware is there. Probed once per app
 * run, in parallel; the result is cached for the `app:capabilities` channel.
 */
export function detectHardwareEncoders(): Promise<VideoEncoder[]> {
  detection ??= Promise.all(
    HARDWARE_ENCODERS.map(async (encoder) => ((await probe(encoder)) ? [encoder] : [])),
  ).then((lists) => {
    const available = lists.flat();
    log.info(`hardware encoders: ${available.length > 0 ? available.join(', ') : 'none'}`);
    return available;
  });
  return detection;
}

/** Test seam: forget the cached detection. */
export function resetEncoderDetection(): void {
  detection = null;
}
