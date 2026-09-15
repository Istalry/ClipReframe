import { Download, FolderOpen, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { invoke } from '../../api';
import { defaultOutputName } from '../../lib/format';
import { useJobStore } from '../../store/jobs';
import { useProjectStore } from '../../store/project';
import { toastError } from '../../store/toasts';
import { Button } from '../ui/Button';

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
  const job = useJobStore((s) => s.exportJob);
  const lastExportPath = useJobStore((s) => s.lastExportPath);
  const startExport = useJobStore((s) => s.startExport);
  const cancelExport = useJobStore((s) => s.cancelExport);

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
              <span className="truncate">Exporting {job.outputPath}</span>
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
              source && '1080×1920 · H.264 · AAC — ready for TikTok and YouTube Shorts'
            )}
          </div>
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
