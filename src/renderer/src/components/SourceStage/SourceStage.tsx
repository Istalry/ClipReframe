import { useCallback, useEffect, useRef, type ReactNode } from 'react';

import {
  gameplayAspectFor,
  gameplayRectKind,
  getRegionAspect,
  toNormalizedAspect,
} from '@shared/geometry/layout';
import { toMediaUrl } from '@shared/media-url';
import type { VideoInfo } from '@shared/types';

import { useFitAspect } from '../../hooks/useFitAspect';
import { useMixSync } from '../../hooks/useMixSync';
import { useActiveSegment } from '../../hooks/useSegments';
import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';
import { selectProxyPath, useProxyStore } from '../../store/proxy';

import { TransformRect } from './TransformRect';

interface SourceStageProps {
  source: VideoInfo;
}

/** The 16:9 source video with the two draggable crop rectangles on top. */
export function SourceStage({ source }: SourceStageProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mixRef = useRef<HTMLAudioElement>(null);
  const fitted = useFitAspect(containerRef, source.width / source.height);

  const settings = useProjectStore((s) => s.settings);
  const selectedRect = useProjectStore((s) => s.selectedRect);
  const setRect = useProjectStore((s) => s.setRect);
  const selectRect = useProjectStore((s) => s.selectRect);
  const trim = useProjectStore((s) => s.trim);
  const proxyPath = useProxyStore(selectProxyPath(source));
  const ensureProxy = useProxyStore((s) => s.ensure);

  const register = usePlayerStore((s) => s.register);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const muted = usePlayerStore((s) => s.muted);
  const mixPath = usePlayerStore((s) => s.mixPath);
  useMixSync(videoRef, mixRef, mixPath !== null);

  useEffect(() => {
    register(videoRef.current);
    return () => {
      register(null);
    };
  }, [register, source.path]);

  const getStageSize = useCallback(() => {
    const el = stageRef.current;
    return el ? { width: el.clientWidth, height: el.clientHeight } : { width: 0, height: 0 };
  }, []);

  const frame = { width: source.width, height: source.height };
  const webcamAspect = toNormalizedAspect(
    getRegionAspect('split', settings.splitRatio, 'webcam'),
    frame,
  );
  // Framing follows the segment under the playhead, like the preview and the export.
  const layout = useActiveSegment().segment.layout;
  const gameplayAspect = gameplayAspectFor(layout, settings.splitRatio, frame);
  const gameplayKind = gameplayRectKind(layout);
  const gameplayRect = layout === 'fill' ? settings.fillRect : settings.gameplayRect;

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={stageRef}
        className="relative overflow-visible bg-black"
        style={{ width: fitted.width, height: fitted.height }}
        onPointerDown={() => {
          selectRect(null);
        }}
      >
        <video
          ref={videoRef}
          src={toMediaUrl(proxyPath ?? source.path)}
          // Two ways Chromium gives up on a codec: an error, or metadata with no video at all
          // (ProRes, some HEVC): the audio plays over a black frame. Either way, make a proxy.
          onError={() => {
            if (!proxyPath) {
              void ensureProxy(source);
            }
          }}
          className="block h-full w-full"
          // With a rendered mix the <audio> below carries the sound, not the file's default track.
          muted={muted || mixPath !== null}
          playsInline
          // Decode the first frame right away so the vertical preview is not black before play.
          preload="auto"
          onPlay={() => {
            setPlaying(true);
          }}
          onPause={() => {
            setPlaying(false);
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            // Preview the trimmed clip as a loop, like the export will play it.
            if (trim && !video.paused && video.currentTime >= trim.end) {
              video.currentTime = trim.start;
            }
            setCurrentTime(video.currentTime);
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            if (e.currentTarget.videoWidth === 0 && !proxyPath) {
              void ensureProxy(source);
            }
          }}
          onEnded={() => {
            setPlaying(false);
          }}
        />
        {mixPath && <audio ref={mixRef} src={toMediaUrl(mixPath)} muted={muted} preload="auto" />}
        <div className="absolute inset-0">
          {layout === 'split' && (
            <TransformRect
              kind="webcam"
              rect={settings.webcamRect}
              normalizedAspect={webcamAspect}
              selected={selectedRect === 'webcam'}
              getStageSize={getStageSize}
              onChange={(r) => {
                setRect('webcam', r);
              }}
              onSelect={() => {
                selectRect('webcam');
              }}
            />
          )}
          <TransformRect
            kind="gameplay"
            rect={gameplayRect}
            normalizedAspect={gameplayAspect}
            selected={selectedRect === 'gameplay'}
            getStageSize={getStageSize}
            onChange={(r) => {
              setRect(gameplayKind, r);
            }}
            onSelect={() => {
              selectRect('gameplay');
            }}
          />
        </div>
      </div>
    </div>
  );
}
