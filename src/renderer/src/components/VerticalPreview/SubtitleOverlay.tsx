import type { CSSProperties, ReactNode } from 'react';

import { wrapWords } from '@shared/subtitles/ass';
import { BOX_PADDING } from '@shared/subtitles/ass-format';
import { effectiveHighlightMode, pillPadding } from '@shared/subtitles/ass-highlight';
import { findActiveCue, findActiveWordIndex, getCueWords } from '@shared/subtitles/cues';
import type { SubtitleCue, SubtitleHighlightMode, SubtitleStyle } from '@shared/types';

import { useLibassFontScale } from '../../hooks/useLibassFontScale';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  style: SubtitleStyle;
  currentTime: number;
  /** Preview pixels per output pixel. */
  scale: number;
}

/**
 * CSS for the word being spoken, mirroring the ASS overrides. The box is a sharp rectangle like
 * libass draws, with a negative margin cancelling its padding so the line keeps exactly the
 * layout of the un-highlighted text.
 */
function highlightStyle(
  mode: SubtitleHighlightMode,
  color: string,
  padding: { x: number; y: number },
): CSSProperties {
  switch (mode) {
    case 'color':
      return { color };
    case 'outline':
      return { WebkitTextStrokeColor: color };
    case 'box':
      return {
        background: color,
        padding: `${padding.y}px ${padding.x}px`,
        margin: `0 -${padding.x}px`,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      };
    case 'none':
      return {};
  }
}

/**
 * DOM approximation of the burned-in ASS style. Sizes follow libass conventions: the font size
 * is ascent + descent (see `useLibassFontScale`), lines are exactly that tall and boxes pad in
 * output pixels, so position, size, colours and wrapping match the export closely.
 */
export function SubtitleOverlay({
  cues,
  style,
  currentTime,
  scale,
}: SubtitleOverlayProps): ReactNode {
  const fontScale = useLibassFontScale(style.fontFamily, style.bold, style.italic);
  const cue = findActiveCue(cues, currentTime);
  if (!cue) {
    return null;
  }
  const words = getCueWords(cue).map((w) => (style.uppercase ? w.text.toUpperCase() : w.text));
  const lines = wrapWords(words, style.maxLineChars);
  // Index of each line's first word in `words`, to map the active index onto the wrapped lines.
  const lineOffsets = lines.map((_, i) => lines.slice(0, i).reduce((n, l) => n + l.length, 0));
  const highlight = effectiveHighlightMode(style);
  const activeIndex = highlight === 'none' ? -1 : findActiveWordIndex(cue, currentTime);
  // libass makes each line as tall as the font size plus the box padding, and lets the outer
  // box overflow the margin by that padding.
  const boxPadY = style.backgroundBox ? BOX_PADDING.y : 0;
  const activeStyle = highlightStyle(highlight, style.highlightColor, {
    x: (style.backgroundBox ? BOX_PADDING.x : pillPadding(style.fontSize)) * scale,
    y: boxPadY * scale,
  });
  // A CSS stroke is centred on the glyph edge and the fill paints over its inner half, whereas
  // libass grows the outline outward; doubling keeps the visible thickness equal.
  const outline = 2 * style.outlineWidth * scale;
  const lineHeight = (style.fontSize + 2 * boxPadY) * scale;
  const margin = (style.marginV - boxPadY) * scale;

  const position: CSSProperties =
    style.alignment === 'top'
      ? { top: margin }
      : style.alignment === 'center'
        ? { top: '50%', transform: 'translateY(-50%)' }
        : { bottom: margin };

  const textStyle: CSSProperties = {
    fontFamily: `"${style.fontFamily}", sans-serif`,
    fontSize: style.fontSize * fontScale * scale,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    color: style.primaryColor,
    lineHeight: `${lineHeight}px`,
    ...(style.backgroundBox
      ? {}
      : {
          WebkitTextStroke: outline > 0 ? `${outline}px ${style.outlineColor}` : undefined,
          paintOrder: 'stroke fill',
          textShadow:
            style.shadow > 0
              ? `${style.shadow * scale}px ${style.shadow * scale}px 0 ${style.outlineColor}`
              : undefined,
        }),
  };
  // libass draws one box per line, padded around the glyph run.
  const lineStyle: CSSProperties = style.backgroundBox
    ? {
        background: `${style.backgroundColor}cc`,
        padding: `${BOX_PADDING.y * scale}px ${BOX_PADDING.x * scale}px`,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }
    : {};

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 flex justify-center px-[4%] text-center"
      style={position}
    >
      <span style={textStyle}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            <span style={lineStyle}>
              {line.map((word, j) => (
                <span key={j}>
                  {j > 0 && ' '}
                  <span style={(lineOffsets[i] ?? 0) + j === activeIndex ? activeStyle : undefined}>
                    {word}
                  </span>
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
