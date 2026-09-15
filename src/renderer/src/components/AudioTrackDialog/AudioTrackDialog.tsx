import { AlertTriangle, AudioLines } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { defaultAudioSelection } from '@shared/audio';
import type { AudioSelection, AudioTrack, VideoInfo } from '@shared/types';

import { Button } from '../ui/Button';

type Column = keyof AudioSelection;

const COLUMN_LABEL: Record<Column, string> = {
  transcribeTracks: 'Subtitles',
  exportTracks: 'Export',
};

const layoutOf = (channels: number): string =>
  channels === 1 ? 'mono' : channels === 2 ? 'stereo' : `${String(channels)} ch`;

function describe(track: AudioTrack): string {
  const parts = [track.codec, layoutOf(track.channels)];
  if (track.sampleRate > 0) {
    parts.push(`${String(Math.round(track.sampleRate / 1000))} kHz`);
  }
  return parts.join(' · ');
}

const toggle = (list: number[], index: number, on: boolean): number[] =>
  on ? [...list, index].sort((a, b) => a - b) : list.filter((t) => t !== index);

interface Props {
  source: VideoInfo;
  initial: AudioSelection;
  onConfirm: (selection: AudioSelection) => void;
  onCancel: () => void;
}

/** Per-clip choice of which audio tracks feed speech recognition and which end up in the export. */
export function AudioTrackDialog({ source, initial, onConfirm, onCancel }: Props): ReactNode {
  const [selection, setSelection] = useState<AudioSelection>(initial);
  const tracks = source.audioTracks;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  const setTrack = (column: Column, index: number, on: boolean): void => {
    setSelection((s) => ({ ...s, [column]: toggle(s[column], index, on) }));
  };
  const setAll = (column: Column, on: boolean): void => {
    setSelection((s) => ({ ...s, [column]: on ? tracks.map((t) => t.index) : [] }));
  };
  const allChecked = (column: Column): boolean => selection[column].length === tracks.length;

  return (
    <div
      className="bg-bg/70 fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-track-dialog-title"
    >
      <div className="bg-panel border-border flex w-[560px] max-w-[95vw] flex-col gap-3 rounded-lg border p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <AudioLines size={18} className="text-accent" />
          <h2 id="audio-track-dialog-title" className="font-semibold">
            Audio tracks
          </h2>
          <span className="text-muted min-w-0 truncate text-xs" title={source.path}>
            {source.fileName}
          </span>
        </div>

        <p className="text-muted text-xs">
          This clip has {tracks.length} audio tracks. Ticked tracks are mixed together: one mix
          feeds speech recognition, one goes into the exported video.
        </p>

        <table className="w-full text-sm">
          <thead className="text-muted text-xs">
            <tr>
              <th className="w-10 py-1 text-left font-normal">#</th>
              <th className="py-1 text-left font-normal">Track</th>
              {(Object.keys(COLUMN_LABEL) as Column[]).map((column) => (
                <th key={column} className="w-24 py-1 text-center font-normal">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label={`All tracks for ${COLUMN_LABEL[column].toLowerCase()}`}
                      checked={allChecked(column)}
                      onChange={(e) => {
                        setAll(column, e.target.checked);
                      }}
                    />
                    {COLUMN_LABEL[column]}
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.index} className="border-border border-t">
                <td className="py-1.5 font-mono text-xs">{track.index + 1}</td>
                <td className="py-1.5">
                  {track.label ? (
                    <>
                      <span className="font-medium">{track.label}</span>
                      <span className="text-muted text-xs"> · {describe(track)}</span>
                    </>
                  ) : (
                    <span className="text-muted text-xs">{describe(track)}</span>
                  )}
                </td>
                {(Object.keys(COLUMN_LABEL) as Column[]).map((column) => (
                  <td key={column} className="py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Track ${String(track.index + 1)} ${COLUMN_LABEL[column].toLowerCase()}`}
                      checked={selection[column].includes(track.index)}
                      onChange={(e) => {
                        setTrack(column, track.index, e.target.checked);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {selection.exportTracks.length === 0 && (
          <div className="text-danger flex items-center gap-1.5 text-xs" role="status">
            <AlertTriangle size={12} />
            No track selected for export: the video will be silent.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onConfirm(defaultAudioSelection(source));
            }}
          >
            Use all tracks
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm(selection);
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
