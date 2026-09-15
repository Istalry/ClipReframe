import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';

import { protocol } from 'electron';

import { fromMediaUrl, MEDIA_SCHEME } from '@shared/media-url';

import { createLogger } from './logger';

const log = createLogger('media');

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.m4a': 'audio/mp4',
};

/** Must run before `app.whenReady()`. */
export function registerMediaSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      // `standard` is required for <video> to load the scheme at all (without it the element
      // fails with MEDIA_ERR_SRC_NOT_SUPPORTED even though the handler answers correctly).
      privileges: {
        standard: true,
        stream: true,
        supportFetchAPI: true,
        bypassCSP: true,
        secure: true,
      },
    },
  ]);
}

/** Parse `bytes=start-end` (either bound optional). Returns null when absent or unsatisfiable. */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header) {
    return null;
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) {
    return null;
  }
  const [, startStr, endStr] = m;
  let start: number;
  let end: number;
  if (startStr) {
    start = Number(startStr);
    end = endStr ? Math.min(Number(endStr), size - 1) : size - 1;
  } else if (endStr) {
    // Suffix range: last N bytes.
    start = Math.max(0, size - Number(endStr));
    end = size - 1;
  } else {
    return null;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

/** Serve a local file with HTTP range support so <video> can seek. */
export async function serveFile(filePath: string, rangeHeader: string | null): Promise<Response> {
  const info = await stat(filePath);
  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const range = parseRange(rangeHeader, info.size);

  const headers: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
  };

  if (range) {
    const length = range.end - range.start + 1;
    headers['Content-Length'] = String(length);
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
    const stream = createReadStream(filePath, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }

  headers['Content-Length'] = String(info.size);
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    status: 200,
    headers,
  });
}

/** Must run after `app.whenReady()`. */
export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      return await serveFile(fromMediaUrl(request.url), request.headers.get('range'));
    } catch (err) {
      log.error(`failed to serve ${request.url}`, err);
      return new Response('Not found', { status: 404 });
    }
  });
}
