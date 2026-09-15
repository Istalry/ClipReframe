import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '@shared/constants';
import { getOutputRegions, toPixelRect } from '@shared/geometry/layout';
import type { ProjectSettings, VideoInfo } from '@shared/types';

import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';

import { SubtitleOverlay } from './SubtitleOverlay';

interface VerticalPreviewProps {
  source: VideoInfo;
}

/** Draw the current video frame through the crop regions into the 9:16 canvas. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  settings: ProjectSettings,
  source: VideoInfo,
): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const frame = { width: source.width, height: source.height };
  for (const region of getOutputRegions(settings.layout, settings.splitRatio)) {
    const rect = region.kind === 'webcam' ? settings.webcamRect : settings.gameplayRect;
    const crop = toPixelRect(rect, frame);
    ctx.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      region.y,
      OUTPUT_WIDTH,
      region.height,
    );
  }
}

export function VerticalPreview({ source }: VerticalPreviewProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const settings = useProjectStore((s) => s.settings);
  const setSplitRatio = useProjectStore((s) => s.setSplitRatio);
  const cues = useProjectStore((s) => s.cues);
  const video = usePlayerStore((s) => s.element);
  const playing = usePlayerStore((s) => s.playing);
  const currentTime = usePlayerStore((s) => s.currentTime);

  // Keep the latest settings in a ref so the rAF loop never closes over stale state.
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Redraw continuously while playing; otherwise once per relevant change (seek, rect drag).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !video) {
      return;
    }
    let raf = 0;
    const draw = (): void => {
      if (video.readyState >= 2) {
        drawFrame(ctx, video, settingsRef.current, source);
      }
      if (playing) {
        raf = requestAnimationFrame(draw);
      }
    };
    if (playing) {
      raf = requestAnimationFrame(draw);
    } else {
      // A seek fires 'seeked' after currentTime changes; draw then so the frame is decoded.
      const onSeeked = (): void => {
        draw();
      };
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('loadeddata', onSeeked);
      draw();
      return () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('loadeddata', onSeeked);
      };
    }
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [video, playing, settings, source, currentTime]);

  // Track the rendered size so the subtitle overlay can scale from output pixels.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setScale(el.clientHeight / OUTPUT_HEIGHT);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const regions = getOutputRegions(settings.layout, settings.splitRatio);
  const splitY = settings.layout === 'split' ? (regions[0]?.height ?? 0) / OUTPUT_HEIGHT : null;

  const onSplitterDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent): void => {
      const top = wrapper.getBoundingClientRect().top;
      setSplitRatio((ev.clientY - top) / wrapper.clientHeight);
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative h-full max-h-full overflow-hidden rounded-md bg-black shadow-lg"
      style={{ aspectRatio: `${OUTPUT_WIDTH} / ${OUTPUT_HEIGHT}` }}
    >
      <canvas
        ref={canvasRef}
        width={OUTPUT_WIDTH}
        height={OUTPUT_HEIGHT}
        className="block h-full w-full"
      />
      {settings.subtitles.enabled && (
        <SubtitleOverlay
          cues={cues}
          style={settings.subtitles.style}
          currentTime={currentTime}
          scale={scale}
        />
      )}
      {splitY !== null && (
        <div
          role="separator"
          aria-label="Split ratio"
          title="Drag to change the split"
          className="group absolute right-0 left-0 h-3 -translate-y-1/2 cursor-row-resize touch-none"
          style={{ top: `${splitY * 100}%` }}
          onPointerDown={onSplitterDown}
        >
          <div className="bg-accent/70 group-hover:bg-accent absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2" />
        </div>
      )}
    </div>
  );
}
