import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { SubtitleAlignment, SubtitleCue, SubtitleStyle } from '../types';

import {
  BOX_ALPHA,
  BOX_PADDING,
  dialogueLine,
  effectiveMarginV,
  escapeAssText,
  eventPrefix,
  hexToAssColor,
  wrapCueText,
} from './ass-format';
import {
  buildHighlightEvents,
  effectiveHighlightMode,
  highlightStyleVariants,
} from './ass-highlight';

export { escapeAssText, formatAssTime, hexToAssColor, wrapCueText, wrapWords } from './ass-format';

/** ASS numpad alignment: 2 = bottom centre, 5 = middle centre, 8 = top centre. */
const ALIGNMENT_CODE: Record<SubtitleAlignment, number> = { bottom: 2, center: 5, top: 8 };

/**
 * `boxAlpha` is the transparency of a background box (BorderStyle 3). Despite the field names,
 * libass fills that box with OutlineColour, padded by Outline, and uses BackColour for the
 * shadow only — so the box colour goes where the outline colour normally lives.
 */
export function buildAssStyleLine(
  style: SubtitleStyle,
  name = 'Default',
  boxAlpha: number = BOX_ALPHA,
): string {
  const borderStyle = style.backgroundBox ? 3 : 1;
  const fields = [
    name,
    style.fontFamily,
    style.fontSize,
    hexToAssColor(style.primaryColor), // PrimaryColour
    hexToAssColor(style.primaryColor), // SecondaryColour (karaoke only)
    style.backgroundBox
      ? hexToAssColor(style.backgroundColor, boxAlpha)
      : hexToAssColor(style.outlineColor), // OutlineColour
    hexToAssColor(style.outlineColor, 0x40), // BackColour (shadow)
    style.bold ? -1 : 0,
    style.italic ? -1 : 0,
    0, // Underline
    0, // StrikeOut
    100, // ScaleX
    100, // ScaleY
    0, // Spacing
    0, // Angle
    borderStyle,
    style.backgroundBox ? BOX_PADDING.y : style.outlineWidth,
    style.shadow,
    ALIGNMENT_CODE[style.alignment],
    40, // MarginL
    40, // MarginR
    effectiveMarginV(style),
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
    ...highlightStyleVariants(style, highlight).map(([name, variant, alpha]) =>
      buildAssStyleLine(variant, name, alpha),
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
      return [dialogueLine(0, cue.start, cue.end, eventPrefix(style) + text)];
    });

  return [...header, ...events, ''].join('\n');
}
