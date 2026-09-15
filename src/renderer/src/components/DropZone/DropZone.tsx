import { FolderOpen, Upload } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';

import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants';

import { getPathForFile, invoke } from '../../api';
import { useProjectStore } from '../../store/project';
import { toastError } from '../../store/toasts';
import { Button } from '../ui/Button';

/** Full-stage drop target shown when no video is loaded. */
export function DropZone(): ReactNode {
  const [over, setOver] = useState(false);
  const loadSource = useProjectStore((s) => s.loadSource);
  const loading = useProjectStore((s) => s.loadingSource);

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) {
      return;
    }
    void loadSource(getPathForFile(file));
  };

  const browse = async (): Promise<void> => {
    try {
      const path = await invoke('dialog:openVideo', { title: 'Open a 16:9 clip' });
      if (path) {
        await loadSource(path);
      }
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div
      data-testid="dropzone"
      className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors ${over ? 'border-accent bg-accent/10' : 'border-border'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={onDrop}
    >
      <Upload size={40} className="text-muted" />
      <div className="text-center">
        <p className="text-base font-semibold">Drop a 16:9 clip here</p>
        <p className="text-muted mt-1 text-xs">{SUPPORTED_VIDEO_EXTENSIONS.join('  ·  ')}</p>
      </div>
      <Button
        variant="primary"
        icon={<FolderOpen size={16} />}
        disabled={loading}
        onClick={() => {
          void browse();
        }}
      >
        {loading ? 'Reading…' : 'Browse…'}
      </Button>
    </div>
  );
}
