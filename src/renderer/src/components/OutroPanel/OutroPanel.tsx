import { AlertTriangle, Clapperboard, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { OUTPUT_ASPECT } from '@shared/constants';

import { invoke } from '../../api';
import { formatTime } from '../../lib/format';
import { useProjectStore } from '../../store/project';
import { toastError } from '../../store/toasts';
import { Button } from '../ui/Button';
import { SectionTitle } from '../ui/Field';

/** Pick / clear the call-to-action video appended after the clip. */
export function OutroPanel(): ReactNode {
  const outro = useProjectStore((s) => s.settings.outro);
  const info = useProjectStore((s) => s.outroInfo);
  const missing = useProjectStore((s) => s.outroMissing);
  const setOutro = useProjectStore((s) => s.setOutro);

  const pick = async (): Promise<void> => {
    try {
      const path = await invoke('dialog:openVideo', {
        title: 'Choose the outro / call-to-action video',
      });
      if (path) {
        await setOutro(path);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const notVertical = info !== null && Math.abs(info.width / info.height - OUTPUT_ASPECT) > 0.02;

  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Outro (call to action)</SectionTitle>
      {outro ? (
        <div className="bg-panel-2 flex flex-col gap-1 rounded-md p-2 text-xs">
          <div className="flex items-start gap-2">
            <Clapperboard size={16} className="text-muted mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate" title={outro.path}>
                {info?.fileName ?? outro.path}
              </div>
              {info && (
                <div className="text-muted">
                  {info.width}×{info.height} · {formatTime(info.duration)}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Remove outro"
              icon={<X size={14} />}
              onClick={() => {
                void setOutro(null);
              }}
            />
          </div>
          {missing && (
            <p className="text-danger flex items-center gap-1">
              <AlertTriangle size={12} /> File not found — pick it again.
            </p>
          )}
          {notVertical && (
            <p className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle size={12} /> Not 9:16 — it will be letterboxed.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted text-xs">Append a vertical video at the end of every export.</p>
      )}
      <Button
        onClick={() => {
          void pick();
        }}
      >
        {outro ? 'Change outro…' : 'Choose outro…'}
      </Button>
    </div>
  );
}
