import { pathToFileURL } from 'node:url';

import { net, protocol } from 'electron';

import { fromMediaUrl, MEDIA_SCHEME } from '@shared/media-url';

/** Must run before `app.whenReady()`. */
export function registerMediaSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { stream: true, supportFetchAPI: true, bypassCSP: true, secure: true },
    },
  ]);
}

/** Must run after `app.whenReady()`. Forwards Range headers so <video> seeking works. */
export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const filePath = fromMediaUrl(request.url);
    return net.fetch(pathToFileURL(filePath).toString(), {
      headers: request.headers,
      bypassCustomProtocolHandlers: true,
    });
  });
}
