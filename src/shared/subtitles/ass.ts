import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { SubtitleAlignment, SubtitleCue, SubtitleStyle } from '../types';

import { dialogueLine, escapeAssText, hexToAssColor, wrapCueText } from './ass-format';
import {
  buildHighlightEvents,
  effectiveHighlightMode,
  highlightStyleVariants,
} from './ass-highlight';

export { escapeAssText, formatAssTime, hexToAssColor, wrapCueText, wrapWords } from './ass-format';

/** ASS numpad alignment: 2 = bottom centre, 5 = middle centre, 8 = top centre. */
const ALIGNMENT_CODE: Record<SubtitleAlignment, number> = { bottom: 2, center: 5, top: 8 };

export function buildAssStyleLine(style: SubtitleStyle, name = 'Default'): string {
  // BorderStyle 3 draws an opaque box using BackColour; 1 draws outline + shadow.
  const borderStyle = style.backgroundBox ? 3 : 1;
  const fields = [
    name,
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
  const highlight = effectiveHighlightMode(style);
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
    ...highlightStyleVariants(style, highlight).map(([name, variant]) =>
      buildAssStyleLine(variant, name),
    ),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = cues
    .filter((c) => c.text.trim().length > 0 && c.end > c.start)
    .sort((a, b) => a.start - b.start)
    .flatMap((cue) => {
      if (highlight !== 'none') {
        return buildHighlightEvents(cue, style, highlight);
      }
      const raw = style.uppercase ? cue.text.toUpperCase() : cue.text;
      const text = wrapCueText(escapeAssText(raw), style.maxLineChars);
      return [dialogueLine(0, cue.start, cue.end, text)];
    });

  return [...header, ...events, ''].join('\n');
}
