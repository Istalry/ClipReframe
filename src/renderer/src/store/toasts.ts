import { create } from 'zustand';

import { AppError } from '@shared/errors';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string | undefined;
}

export interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, detail?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const AUTO_DISMISS_MS: Record<ToastKind, number> = { info: 4000, success: 5000, error: 10000 };

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, title, detail) => {
    const id = nextId;
    nextId += 1;
    set({ toasts: [...get().toasts, { id, kind, title, detail }] });
    window.setTimeout(() => {
      get().dismiss(id);
    }, AUTO_DISMISS_MS[kind]);
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Convenience for catch blocks: surfaces any error as a toast. */
export function toastError(err: unknown, fallbackTitle = 'Something went wrong'): void {
  if (err instanceof AppError) {
    useToastStore.getState().push('error', err.message, err.details);
  } else if (err instanceof Error) {
    useToastStore.getState().push('error', fallbackTitle, err.message);
  } else {
    useToastStore.getState().push('error', fallbackTitle, String(err));
  }
}
