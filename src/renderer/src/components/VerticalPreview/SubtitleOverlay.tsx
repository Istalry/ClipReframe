import type { CSSProperties, ReactNode } from 'react';

import { wrapWords } from '@shared/subtitles/ass';
import { boxPadding, effectiveMarginV } from '@shared/subtitles/ass-format';
import { effectiveHighlightMode } from '@shared/subtitles/ass-highlight';
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

/** Opacity of the background box; the ASS style uses the matching alpha. */
const BOX_OPACITY = 0.8;

/**
 * CSS for the word being spoken, mirroring the ASS overrides. The box is a sharp rectangle like
 * libass draws, with a negative margin cancelling its padding so the line keeps exactly the
 * layout of the un-highlighted text; inline vertical padding overflows the line box like libass.
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
 * is ascent + descent (see `useLibassFontScale`), lines are exactly that tall whatever the box
 * padding (boxes overflow, and the outer one overflows the margin), and boxes pad in output
 * pixels. Like the ASS layers, boxes that must sit under every glyph are drawn on invisible
 * copies of the text behind the real one — same metrics, so they line up.
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
  const pad = boxPadding(style);
  const activeStyle = highlightStyle(highlight, style.highlightColor, {
    x: pad.x * scale,
    y: pad.y * scale,
  });
  // A CSS stroke is centred on the glyph edge and the fill paints over its inner half, whereas
  // libass grows the outline outward; doubling keeps the visible thickness equal.
  const outline = 2 * style.outlineWidth * scale;
  const margin = effectiveMarginV(style) * scale;

  const position: CSSProperties =
    style.alignment === 'top'
      ? { top: margin }
      : style.alignment === 'center'
        ? { top: `calc(50% + ${style.offsetY * scale}px)`, transform: 'translateY(-50%)' }
        : { bottom: margin };

  const textStyle: CSSProperties = {
    fontFamily: `"${style.fontFamily}", sans-serif`,
    fontSize: style.fontSize * fontScale * scale,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    color: style.primaryColor,
    lineHeight: `${style.fontSize * scale}px`,
    // Lines are explicit blocks; padded boxes must not re-wrap them.
    whiteSpace: 'nowrap',
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
  // An invisible copy of the text: same layout, only the boxes it carries are painted.
  const layerStyle: CSSProperties = {
    ...textStyle,
    position: 'absolute',
    inset: 0,
    color: 'transparent',
    WebkitTextStroke: undefined,
    textShadow: undefined,
  };
  // libass draws one box per line, padded around the glyph run; overlapping lines merge, hence
  // opaque boxes on a translucent layer rather than translucent boxes.
  const lineBoxStyle: CSSProperties = {
    background: style.backgroundColor,
    padding: `${pad.y * scale}px ${pad.x * scale}px`,
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
  };
  // Under an outlined base the pill sits below every glyph; on a box base it sits on top.
  const pillUnderneath = highlight === 'box' && !style.backgroundBox;

  const renderLines = (
    lineStyle: CSSProperties | undefined,
    active: CSSProperties | undefined,
  ): ReactNode =>
    lines.map((line, i) => (
      <span key={i} className="block">
        <span style={lineStyle}>
          {line.map((word, j) => (
            <span key={j}>
              {j > 0 && ' '}
              <span style={(lineOffsets[i] ?? 0) + j === activeIndex ? active : undefined}>
                {word}
              </span>
            </span>
          ))}
        </span>
      </span>
    ));

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 flex justify-center px-[4%] text-center"
      style={position}
    >
      <span
        className="relative inline-block"
        // Room for the line boxes: an overflowing centred line would start-align instead.
        style={{ padding: `0 ${style.backgroundBox ? pad.x * scale : 0}px` }}
      >
        {style.backgroundBox && (
          <span aria-hidden style={{ ...layerStyle, opacity: BOX_OPACITY }}>
            {renderLines(lineBoxStyle, undefined)}
          </span>
        )}
        {pillUnderneath && (
          <span aria-hidden style={layerStyle}>
            {renderLines(undefined, activeStyle)}
          </span>
        )}
        <span className="relative" style={textStyle}>
          {renderLines(undefined, pillUnderneath ? undefined : activeStyle)}
        </span>
      </span>
    </div>
  );
}
