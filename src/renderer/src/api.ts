import { AppError } from '@shared/errors';
import type {
  EventChannel,
  EventPayload,
  InvokeChannel,
  InvokeRequest,
  InvokeResponse,
} from '@shared/ipc-contract';

/** Call a main-process handler. Rejects with an `AppError` carrying the original code. */
export async function invoke<C extends InvokeChannel>(
  channel: C,
  request: InvokeRequest<C>,
): Promise<InvokeResponse<C>> {
  const result = await window.api.invoke(channel, request);
  if (result.ok) {
    return result.value;
  }
  throw new AppError(result.error.code, result.error.message, result.error.details);
}

export function subscribe<C extends EventChannel>(
  channel: C,
  listener: (payload: EventPayload<C>) => void,
): () => void {
  return window.api.on(channel, listener);
}

export function getPathForFile(file: File): string {
  return window.api.getPathForFile(file);
}

let jobCounter = 0;
export function newJobId(prefix: string): string {
  jobCounter += 1;
  return `${prefix}-${Date.now()}-${jobCounter}`;
}
