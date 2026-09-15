/**
 * `media://local/<encoded absolute path>` — the custom scheme the main process serves local
 * files through so the renderer can play them in a <video> tag with `webSecurity` left on.
 */
export const MEDIA_SCHEME = 'media';

const PREFIX = `${MEDIA_SCHEME}://local/`;

export function toMediaUrl(absolutePath: string): string {
  return `${PREFIX}${encodeURIComponent(absolutePath)}`;
}

export function fromMediaUrl(url: string): string {
  if (!url.startsWith(PREFIX)) {
    throw new Error(`Not a media URL: ${url}`);
  }
  return decodeURIComponent(url.slice(PREFIX.length));
}
