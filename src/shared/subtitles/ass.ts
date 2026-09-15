import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { SubtitleAlignment, SubtitleCue, SubtitleStyle } from '../types';

/** `#rrggbb` → ASS `&HAABBGGRR` (alpha 00 = opaque). */
export function hexToAssColor(hex: string, alpha = 0): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) {
    throw new Error(`Invalid colour: ${hex}`);
  }
  const [, r, g, b] = m;
  const a = alpha.toString(16).padStart(2, '0');
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/** Seconds → `H:MM:SS.cc` (centiseconds, as ASS requires). */
export function formatAssTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total - Math.floor(total)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** ASS numpad alignment: 2 = bottom centre, 5 = middle centre, 8 = top centre. */
const ALIGNMENT_CODE: Record<SubtitleAlignment, number> = { bottom: 2, center: 5, top: 8 };

/** Greedy word-wrap producing `\N`-separated lines no longer than `maxChars` when possible. */
export function wrapCueText(text: string, maxChars: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.join('\\N');
}

const escapeAssText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\N');

export function buildAssStyleLine(style: SubtitleStyle): string {
  // BorderStyle 3 draws an opaque box using BackColour; 1 draws outline + shadow.
  const borderStyle = style.backgroundBox ? 3 : 1;
  const fields = [
    'Default',
    style.fontFamily,
    style.fontSize,
    hexToAssColor(style.primaryColor), // PrimaryColour
    hexToAssColor(style.primaryColor), // SecondaryColour (karaoke only)
    hexToAssColor(style.outlineColor), // OutlineColour
    hexToAssColor(style.backgroundBox ? style.backgroundColor : style.outlineColor, 0x40), // BackColour
    style.bold ? -1 : 0,
    style.italic ? -1 : 0,
    0, // Underline
    0, // StrikeOut
    100, // ScaleX
    100, // ScaleY
    0, // Spacing
    0, // Angle
    borderStyle,
    style.outlineWidth,
    style.shadow,
    ALIGNMENT_CODE[style.alignment],
    40, // MarginL
    40, // MarginR
    style.marginV,
    1, // Encoding
  ];
  return `Style: ${fields.join(',')}`;
}

/** Build a complete ASS document targeting the 1080×1920 output canvas. */
export function buildAss(cues: SubtitleCue[], style: SubtitleStyle): string {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${OUTPUT_WIDTH}`,
    `PlayResY: ${OUTPUT_HEIGHT}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    'YCbCr Matrix: TV.709',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    buildAssStyleLine(style),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = cues
    .filter((c) => c.text.trim().length > 0 && c.end > c.start)
    .sort((a, b) => a.start - b.start)
    .map((cue) => {
      const raw = style.uppercase ? cue.text.toUpperCase() : cue.text;
      const text = wrapCueText(escapeAssText(raw), style.maxLineChars);
      return `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(cue.end)},Default,,0,0,0,,${text}`;
    });

  return [...header, ...events, ''].join('\n');
}
