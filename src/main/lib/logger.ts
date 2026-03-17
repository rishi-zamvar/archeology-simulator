/**
 * Structured logger factory for the main process.
 *
 * Usage:
 *   const log = createLogger('GameIPC');
 *   log.info('Handler called', { channel: 'game:load' });
 *
 * Output format:
 *   [2026-03-17T12:00:00.000Z] [GameIPC    ] INFO : message {"key":"value"}
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

const MODULE_PAD = 12;
const LEVEL_PAD = 5;

function formatMessage(
  module: string,
  level: string,
  msg: string,
  ctx?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const paddedModule = module.padEnd(MODULE_PAD);
  const paddedLevel = level.toUpperCase().padEnd(LEVEL_PAD);
  const ctxStr =
    ctx != null && Object.keys(ctx).length > 0
      ? ' ' + JSON.stringify(ctx)
      : '';
  return `[${timestamp}] [${paddedModule}] ${paddedLevel}: ${msg}${ctxStr}`;
}

/**
 * Create a module-scoped logger. The module name is fixed at creation time.
 *
 * In test/CI environments (NODE_ENV === 'test'), debug and info output is
 * suppressed to keep test output clean. warn and error always emit.
 */
export function createLogger(module: string): Logger {
  const isTest = process.env['NODE_ENV'] === 'test';

  return {
    debug(msg: string, ctx?: Record<string, unknown>): void {
      if (isTest) return;
      console.debug(formatMessage(module, 'debug', msg, ctx));
    },
    info(msg: string, ctx?: Record<string, unknown>): void {
      if (isTest) return;
      console.info(formatMessage(module, 'info', msg, ctx));
    },
    warn(msg: string, ctx?: Record<string, unknown>): void {
      console.warn(formatMessage(module, 'warn', msg, ctx));
    },
    error(msg: string, ctx?: Record<string, unknown>): void {
      console.error(formatMessage(module, 'error', msg, ctx));
    },
  };
}
