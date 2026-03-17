/**
 * Higher-order function that enforces the typed IPC contract.
 *
 * Every IPC handler MUST be registered through wrapHandler. This ensures:
 *   1. Optional input validation runs before the handler body
 *   2. Errors are caught and converted to { success: false, error } — handlers never throw to the renderer
 *   3. Successful results are wrapped in { success: true, data }
 *   4. Errors are automatically logged with channel context
 *
 * Usage:
 *   wrapHandler<Port[]>('game:getPorts', async () => db.getPorts());
 *   wrapHandler<Port>('game:getPortDetails', async (id) => db.getPort(id), (id) => id ? null : 'portId required');
 */

import { ipcMain } from 'electron';
import type { IPCResponse } from '../../shared/ipc-types';
import { createLogger } from './logger';

const log = createLogger('IPCWrapper');

/**
 * Validator for handler arguments.
 * Return null when arguments are valid; return an error string when invalid.
 */
export type Validator<A extends unknown[]> = (...args: A) => string | null;

/**
 * Register an IPC handler that enforces the IPC contract:
 *   validator (optional) → try/catch → IPCResponse<T>
 *
 * @param channel   - The IPC channel name (e.g. 'game:load')
 * @param handler   - Pure async function that performs the actual work
 * @param validator - Optional function that validates args; return null if valid, error string if not
 *
 * The wrapper is the ONLY place ipcMain.handle is called.
 * Handlers themselves are pure async functions with no IPC awareness.
 */
export function wrapHandler<T, A extends unknown[] = []>(
  channel: string,
  handler: (...args: A) => T | Promise<T>,
  validator?: Validator<A>
): void {
  ipcMain.handle(channel, async (_event, ...args: A): Promise<IPCResponse<T>> => {
    if (validator != null) {
      const validationError = validator(...args);
      if (validationError != null) {
        return { success: false, error: validationError };
      }
    }

    try {
      const data = await handler(...args);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('Handler failed', { channel, error: message });
      return { success: false, error: message };
    }
  });
}
