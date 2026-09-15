import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';

import { AppError, toAppError } from '@shared/errors';
import {
  eventContract,
  invokeContract,
  type EventChannel,
  type EventPayload,
  type InvokeChannel,
  type InvokeRequest,
  type InvokeResponse,
  type IpcResult,
} from '@shared/ipc-contract';

import { createLogger } from '../logger';

const log = createLogger('ipc');

export type Handler<C extends InvokeChannel> = (
  request: InvokeRequest<C>,
  event: IpcMainInvokeEvent,
) => Promise<InvokeResponse<C>> | InvokeResponse<C>;

/**
 * Register a handler for a contract channel. The request is validated against the contract
 * schema and the result wrapped in an `IpcResult` envelope so `AppError.code` survives the bridge.
 */
export function handle<C extends InvokeChannel>(channel: C, handler: Handler<C>): void {
  const { request: requestSchema } = invokeContract[channel];
  ipcMain.handle(channel, async (event, raw: unknown): Promise<IpcResult<InvokeResponse<C>>> => {
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      log.warn(`invalid request on ${channel}`, parsed.error.issues);
      return {
        ok: false,
        error: new AppError(
          'INVALID_INPUT',
          `Invalid request for ${channel}`,
          parsed.error.message,
        ).toJSON(),
      };
    }
    try {
      const value = await handler(parsed.data as InvokeRequest<C>, event);
      return { ok: true, value };
    } catch (err) {
      const appError = toAppError(err);
      log.error(`${channel} failed: ${appError.message}`, appError.details);
      return { ok: false, error: appError.toJSON() };
    }
  });
}

/** Send a contract event to a renderer, validating the payload in development. */
export function emit<C extends EventChannel>(
  target: WebContents,
  channel: C,
  payload: EventPayload<C>,
): void {
  if (target.isDestroyed()) {
    return;
  }
  if (import.meta.env.DEV) {
    eventContract[channel].parse(payload);
  }
  target.send(channel, payload);
}
