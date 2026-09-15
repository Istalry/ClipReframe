import type { CSSProperties, ReactNode } from 'react';

import { wrapCueText } from '@shared/subtitles/ass';
import { findActiveCue } from '@shared/subtitles/cues';
import type { SubtitleCue, SubtitleStyle } from '@shared/types';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  style: SubtitleStyle;
  currentTime: number;
  /** Preview pixels per output pixel. */
  scale: number;
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
  const raw = style.uppercase ? cue.text.toUpperCase() : cue.text;
  const lines = wrapCueText(raw, style.maxLineChars).split('\\N');
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
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}
