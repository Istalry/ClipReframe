/** ffmpeg pixel formats whose name does not start with a family prefix but still carries alpha. */
const ALPHA_FORMATS = new Set([
  'rgba',
  'bgra',
  'argb',
  'abgr',
  'rgba64le',
  'rgba64be',
  'bgra64le',
  'bgra64be',
  'pal8',
]);

/** Families that always carry alpha: `yuva420p`, `ya8`, `gbrap10le`, … */
const ALPHA_PREFIXES = ['yuva', 'ya', 'gbrap'];

/**
 * Whether an ffprobe `pix_fmt` carries an alpha channel. Used to decide if an outro has to be
 * composited over black rather than simply having its alpha dropped: a transparent video's colour
 * values are undefined where it is transparent, so dropping alpha paints that residue.
 */
export function hasAlphaChannel(pixelFormat: string | undefined): boolean {
  if (!pixelFormat) {
    return false;
  }
  const name = pixelFormat.toLowerCase();
  return ALPHA_FORMATS.has(name) || ALPHA_PREFIXES.some((prefix) => name.startsWith(prefix));
}
