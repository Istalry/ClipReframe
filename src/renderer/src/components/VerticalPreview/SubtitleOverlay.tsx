import type { CSSProperties, ReactNode } from 'react';

import { wrapWords } from '@shared/subtitles/ass';
import { effectiveHighlightMode } from '@shared/subtitles/ass-highlight';
import { findActiveCue, findActiveWordIndex, getCueWords } from '@shared/subtitles/cues';
import type { SubtitleCue, SubtitleHighlightMode, SubtitleStyle } from '@shared/types';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  style: SubtitleStyle;
  currentTime: number;
  /** Preview pixels per output pixel. */
  scale: number;
}

/**
 * CSS for the word being spoken. The box uses a negative margin to cancel its padding so the
 * line keeps exactly the layout of the un-highlighted text, like the layered ASS pill does.
 */
function highlightStyle(mode: SubtitleHighlightMode, color: string): CSSProperties {
  switch (mode) {
    case 'color':
      return { color };
    case 'outline':
      return { WebkitTextStrokeColor: color };
    case 'box':
      return {
        background: color,
        borderRadius: '0.25em',
        padding: '0 0.18em',
        margin: '0 -0.18em',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      };
    case 'none':
      return {};
  }
}

/**
 * DOM approximation of the burned-in ASS style. libass and CSS differ slightly (outline
 * rasterisation, line height) but position, size, colours and wrapping match closely.
 */
export function SubtitleOverlay({
  cues,
  style,
  currentTime,
  scale,
}: SubtitleOverlayProps): ReactNode {
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
  const activeStyle = highlightStyle(highlight, style.highlightColor);
  const outline = style.outlineWidth * scale;

  const position: CSSProperties =
    style.alignment === 'top'
      ? { top: style.marginV * scale }
      : style.alignment === 'center'
        ? { top: '50%', transform: 'translateY(-50%)' }
        : { bottom: style.marginV * scale };

  const textStyle: CSSProperties = {
    fontFamily: `"${style.fontFamily}", sans-serif`,
    fontSize: style.fontSize * scale,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    color: style.primaryColor,
    lineHeight: 1.2,
    ...(style.backgroundBox
      ? { background: `${style.backgroundColor}cc`, padding: `${4 * scale}px ${10 * scale}px` }
      : {
          WebkitTextStroke: outline > 0 ? `${outline}px ${style.outlineColor}` : undefined,
          paintOrder: 'stroke fill',
          textShadow:
            style.shadow > 0
              ? `${style.shadow * scale}px ${style.shadow * scale}px 0 ${style.outlineColor}`
              : undefined,
        }),
  };

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 flex justify-center px-[4%] text-center"
      style={position}
    >
      <span style={textStyle}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line.map((word, j) => (
              <span key={j}>
                {j > 0 && ' '}
                <span style={(lineOffsets[i] ?? 0) + j === activeIndex ? activeStyle : undefined}>
                  {word}
                </span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
