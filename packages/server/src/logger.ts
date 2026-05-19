export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Arbitrary structured fields attached to a log entry. */
export type LogFields = Record<string, unknown>;

/** Structured logger interface. Backed by JSON-per-line on stdout/stderr. */
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Return a logger that prepends the given bindings to every entry. */
  child(bindings: LogFields): Logger;
}

interface LoggerOptions {
  level: LogLevel;
  bindings?: LogFields;
}

function emit(level: LogLevel, msg: string, fields: LogFields, bindings: LogFields): void {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    msg,
    ...bindings,
    ...fields,
  };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(entry)}\n`);
}

/**
 * Build a JSON structured logger. Entries below the configured level are
 * suppressed; `child(bindings)` returns a derived logger with the supplied
 * bindings merged into every subsequent entry.
 */
export function createLogger(options: LoggerOptions): Logger {
  const threshold = LEVEL_PRIORITY[options.level];
  const bindings = options.bindings ?? {};

  const log = (level: LogLevel, msg: string, fields: LogFields = {}): void => {
    if (LEVEL_PRIORITY[level] < threshold) return;
    emit(level, msg, fields, bindings);
  };

  return {
    debug: (msg, fields) => log('debug', msg, fields),
    info: (msg, fields) => log('info', msg, fields),
    warn: (msg, fields) => log('warn', msg, fields),
    error: (msg, fields) => log('error', msg, fields),
    child: (extra) => createLogger({ level: options.level, bindings: { ...bindings, ...extra } }),
  };
}
