import { useCallback, useEffect, useRef, type ReactNode } from 'react';

import { getRegionAspect, toNormalizedAspect } from '@shared/geometry/layout';
import { toMediaUrl } from '@shared/media-url';
import type { VideoInfo } from '@shared/types';

import { useFitAspect } from '../../hooks/useFitAspect';
import { useMixSync } from '../../hooks/useMixSync';
import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';

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
  const gameplayAspect = toNormalizedAspect(
    getRegionAspect(settings.layout, settings.splitRatio, 'gameplay'),
    frame,
  );

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
          src={toMediaUrl(source.path)}
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
          }}
          onEnded={() => {
            setPlaying(false);
          }}
        />
        {mixPath && <audio ref={mixRef} src={toMediaUrl(mixPath)} muted={muted} preload="auto" />}
        <div className="absolute inset-0">
          {settings.layout === 'split' && (
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
            rect={settings.gameplayRect}
            normalizedAspect={gameplayAspect}
            selected={selectedRect === 'gameplay'}
            getStageSize={getStageSize}
            onChange={(r) => {
              setRect('gameplay', r);
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
