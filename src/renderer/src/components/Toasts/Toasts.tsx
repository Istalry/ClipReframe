import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useToastStore, type ToastKind } from '../../store/toasts';

const ICON: Record<ToastKind, ReactNode> = {
  info: <Info size={16} className="text-accent" />,
  success: <CheckCircle2 size={16} className="text-success" />,
  error: <AlertCircle size={16} className="text-danger" />,
};

export function Toasts(): ReactNode {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 bottom-18 z-50 flex w-96 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="bg-panel-2 border-border pointer-events-auto flex items-start gap-2 rounded-md border p-3 shadow-lg"
        >
          <span className="mt-0.5 shrink-0">{ICON[t.kind]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t.title}</div>
            {t.detail && <div className="text-muted mt-0.5 text-xs break-words">{t.detail}</div>}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted hover:text-text"
            onClick={() => {
              dismiss(t.id);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
