import { getFonts } from 'font-list';

import { createLogger } from '../logger';

const log = createLogger('fonts');

const FALLBACK_FONTS = [
  'Arial',
  'Arial Black',
  'Impact',
  'Segoe UI',
  'Verdana',
  'Tahoma',
  'Georgia',
];

let cache: Promise<string[]> | null = null;

/** Installed font family names, sorted, cached for the process lifetime. */
export function listSystemFonts(): Promise<string[]> {
  cache ??= getFonts({ disableQuoting: true })
    .then((fonts) => {
      const unique = [...new Set(fonts.map((f) => f.trim()).filter(Boolean))];
      return unique.sort((a, b) => a.localeCompare(b));
    })
    .catch((err: unknown) => {
      log.warn('font enumeration failed, using fallback list', err);
      return FALLBACK_FONTS;
    });
  return cache;
}
