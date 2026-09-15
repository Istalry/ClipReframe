import { spawn } from 'node:child_process';

import { AppError, type ErrorCode } from '@shared/errors';

import { createLogger } from '../logger';

const log = createLogger('process');

export interface RunOptions {
  cwd?: string;
  signal?: AbortSignal;
  /** Called for every line written to stdout. */
  onStdoutLine?: (line: string) => void;
  /** Called for every line written to stderr. */
  onStderrLine?: (line: string) => void;
  /** Error code to use when the process exits non-zero. */
  failureCode: ErrorCode;
  /** Error code to use when aborted through `signal`. */
  cancelCode: ErrorCode;
  /** Keep only the last N stderr lines for error messages. */
  stderrTailLines?: number;
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

/** Splits a stream into complete lines; ffmpeg uses `\r` for in-place progress so treat it as EOL. */
function lineSplitter(onLine: (line: string) => void): (chunk: Buffer) => void {
  let buffer = '';
  return (chunk: Buffer): void => {
    buffer += chunk.toString('utf8');
    const parts = buffer.split(/\r\n|\r|\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (part.length > 0) {
        onLine(part);
      }
    }
  };
}

/**
 * Spawn a binary and resolve when it exits 0. All child processes in the app go through here so
 * cancellation, logging and error mapping behave the same everywhere.
 */
export function run(command: string, args: string[], options: RunOptions): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    if (options.signal?.aborted) {
      reject(new AppError(options.cancelCode, 'Cancelled before start'));
      return;
    }
    log.info(`spawn ${command} ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);

    const child = spawn(command, args, {
      ...(options.cwd ? { cwd: options.cwd } : {}),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: string[] = [];
    const stderrLines: string[] = [];
    const tail = options.stderrTailLines ?? 40;

    child.stdout.on(
      'data',
      lineSplitter((line) => {
        stdoutChunks.push(line);
        options.onStdoutLine?.(line);
      }),
    );
    child.stderr.on(
      'data',
      lineSplitter((line) => {
        stderrLines.push(line);
        if (stderrLines.length > tail) {
          stderrLines.shift();
        }
        options.onStderrLine?.(line);
      }),
    );

    let cancelled = false;
    const onAbort = (): void => {
      cancelled = true;
      child.kill('SIGKILL');
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    child.on('error', (err) => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new AppError(options.failureCode, `Failed to start ${command}: ${err.message}`));
    });

    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', onAbort);
      const stderr = stderrLines.join('\n');
      if (cancelled) {
        reject(new AppError(options.cancelCode, 'Cancelled'));
      } else if (code === 0) {
        resolvePromise({ stdout: stdoutChunks.join('\n'), stderr });
      } else {
        log.error(`${command} exited with code ${String(code)}`, stderr);
        reject(
          new AppError(options.failureCode, `${command} exited with code ${String(code)}`, stderr),
        );
      }
    });
  });
}
