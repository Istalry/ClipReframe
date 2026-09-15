export const ERROR_CODES = [
  'BINARY_MISSING',
  'PROBE_FAILED',
  'UNSUPPORTED_MEDIA',
  'EXPORT_FAILED',
  'EXPORT_CANCELLED',
  'TRANSCRIBE_FAILED',
  'TRANSCRIBE_CANCELLED',
  'PRESETS_CORRUPT',
  'PRESET_NOT_FOUND',
  'FILE_NOT_FOUND',
  'INVALID_INPUT',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Application error with a stable code so the UI can react without parsing messages. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: string | undefined;

  constructor(code: ErrorCode, message: string, details?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  /** Serialisable shape that survives the IPC boundary. */
  toJSON(): SerializedError {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export interface SerializedError {
  code: ErrorCode;
  message: string;
  details?: string | undefined;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

export function toAppError(err: unknown, fallback: ErrorCode = 'UNKNOWN'): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    return new AppError(fallback, err.message);
  }
  return new AppError(fallback, String(err));
}
