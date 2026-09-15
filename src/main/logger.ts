/* eslint-disable no-console */
type Level = 'info' | 'warn' | 'error';

const stamp = (): string => new Date().toISOString();

function write(level: Level, scope: string, message: string, extra?: unknown): void {
  const line = `${stamp()} [${level.toUpperCase()}] [${scope}] ${message}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (extra === undefined) {
    fn(line);
  } else {
    fn(line, extra);
  }
}

export interface Logger {
  info(message: string, extra?: unknown): void;
  warn(message: string, extra?: unknown): void;
  error(message: string, extra?: unknown): void;
}

export const createLogger = (scope: string): Logger => ({
  info: (m, e) => {
    write('info', scope, m, e);
  },
  warn: (m, e) => {
    write('warn', scope, m, e);
  },
  error: (m, e) => {
    write('error', scope, m, e);
  },
});
