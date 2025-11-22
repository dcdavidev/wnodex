import { NODE_ENV_VALUES } from '../consts/node-env.js';
import { getNodeEnv } from './get-node-env.js';

/**
 * Returns true if process.env.NODE_ENV is set to 'development'.
 * @returns {boolean} Returns `true` if the current Node environment is development, otherwise `false`.
 *
 * @example
 * const dev = isDevelopment();
 */
export function isDevelopment(): boolean {
  const nodeEnv = getNodeEnv();

  return nodeEnv === NODE_ENV_VALUES.DEVELOPMENT;
}
