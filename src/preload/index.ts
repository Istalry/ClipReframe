import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';

import type {
  EventChannel,
  EventPayload,
  InvokeChannel,
  InvokeRequest,
  InvokeResponse,
  IpcResult,
  PreloadApi,
} from '@shared/ipc-contract';

const api: PreloadApi = {
  invoke<C extends InvokeChannel>(
    channel: C,
    request: InvokeRequest<C>,
  ): Promise<IpcResult<InvokeResponse<C>>> {
    return ipcRenderer.invoke(channel, request) as Promise<IpcResult<InvokeResponse<C>>>;
  },

  on<C extends EventChannel>(channel: C, listener: (payload: EventPayload<C>) => void): () => void {
    const wrapped = (_event: IpcRendererEvent, payload: EventPayload<C>): void => {
      listener(payload);
    };
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },

  getPathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },
};

contextBridge.exposeInMainWorld('api', api);
