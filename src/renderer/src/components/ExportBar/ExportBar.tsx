import { Cpu, Download, FolderOpen, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { VIDEO_ENCODER_LABELS } from '@shared/export/encoders';
import { trimmedDuration } from '@shared/export/trim';

import { invoke } from '../../api';
import { defaultOutputName, formatTime } from '../../lib/format';
import { useAppStore, type EncoderPreference } from '../../store/app';
import { useJobStore } from '../../store/jobs';
import { useProjectStore } from '../../store/project';
import { toastError } from '../../store/toasts';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';

const LAST_FOLDER_KEY = 'clipreframe.lastExportFolder';

function readLastFolder(): string | undefined {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeLastFolder(folder: string): void {
  try {
    localStorage.setItem(LAST_FOLDER_KEY, folder);
  } catch {
    /* storage unavailable — remembering the folder is a convenience only */
  }
}

export function ExportBar(): ReactNode {
  const source = useProjectStore((s) => s.source);
  const outroMissing = useProjectStore((s) => s.outroMissing);
  const trim = useProjectStore((s) => s.trim);
  const job = useJobStore((s) => s.exportJob);
  const lastExportPath = useJobStore((s) => s.lastExportPath);
  const startExport = useJobStore((s) => s.startExport);
  const cancelExport = useJobStore((s) => s.cancelExport);
  const hardwareEncoders = useAppStore((s) => s.hardwareEncoders);
  const encoderPreference = useAppStore((s) => s.encoderPreference);
  const setEncoderPreference = useAppStore((s) => s.setEncoderPreference);
  const encoder = useAppStore((s) => s.resolveEncoder)();

  // Only offer the choice once detection found a GPU encoder; otherwise it is CPU anyway.
  const gpuLabel = hardwareEncoders?.[0] ? VIDEO_ENCODER_LABELS[hardwareEncoders[0]] : null;
  const encoderOptions: { value: EncoderPreference; label: string }[] = [
    { value: 'auto', label: gpuLabel ? `GPU · ${gpuLabel}` : 'GPU (none detected)' },
    { value: 'cpu', label: VIDEO_ENCODER_LABELS.libx264 },
  ];

  const onExport = async (): Promise<void> => {
    if (!source) {
      return;
    }
    try {
      const folder = await invoke('dialog:chooseFolder', { defaultPath: readLastFolder() });
      if (!folder) {
        return;
      }
      writeLastFolder(folder);
      await startExport(`${folder}\\${defaultOutputName(source.fileName)}`);
    } catch (err) {
      toastError(err);
    }
  };

  const percent = job?.progress ? Math.round(job.progress.fraction * 100) : 0;

  return (
    <div className="border-border bg-panel flex h-14 items-center gap-3 border-t px-4">
      {job ? (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="truncate">
                Exporting {job.outputPath}
                <span className="text-muted"> · {VIDEO_ENCODER_LABELS[job.encoder]}</span>
              </span>
              <span className="text-muted tabular-nums">
                {percent}% {job.progress?.speed && `· ${job.progress.speed}`}
              </span>
            </div>
            <div className="bg-border h-1.5 overflow-hidden rounded">
              <div className="bg-accent h-full transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <Button
            variant="danger"
            icon={<X size={14} />}
            onClick={() => {
              void cancelExport();
            }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <div className="text-muted min-w-0 flex-1 truncate text-xs">
            {lastExportPath ? (
              <button
                type="button"
                className="hover:text-text inline-flex items-center gap-1"
                onClick={() => {
                  void invoke('app:showInFolder', { path: lastExportPath });
                }}
              >
                <FolderOpen size={13} /> {lastExportPath}
              </button>
            ) : (
              source &&
              `${trim ? `Trimmed to ${formatTime(trimmedDuration(source.duration, trim))} · ` : ''}1080×1920 · H.264 (${VIDEO_ENCODER_LABELS[encoder]}) · AAC — ready for TikTok and YouTube Shorts`
            )}
          </div>
          {hardwareEncoders && hardwareEncoders.length > 0 && (
            <label className="text-muted flex items-center gap-1.5 text-xs" title="Video encoder">
              <Cpu size={13} />
              <Select<EncoderPreference>
                value={encoderPreference}
                options={encoderOptions}
                onChange={setEncoderPreference}
              />
            </label>
          )}
          <Button
            variant="primary"
            size="lg"
            icon={<Download size={16} />}
            disabled={!source || outroMissing}
            title={outroMissing ? 'The outro video is missing' : undefined}
            onClick={() => {
              void onExport();
            }}
          >
            Export
          </Button>
        </>
      )}
    </div>
  );
}
