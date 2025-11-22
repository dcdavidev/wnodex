import { ConfigError } from '../errors/config-error.js';
import {
  WnodexConfigInput,
  WnodexConfigOutput,
  WnodexConfigSchema,
} from '../schemas';

/**
 * Validates the provided config using NodexConfigSchema.
 * Throws ValidationError if validation fails.
 * @param config Raw configuration input for Nodex.
 * @returns Validated configuration.
 * @throws {ConfigError} If configuration is invalid.
 * @example
 * const config = setupConfig(rawConfig);
 */
export function setupConfig(config: WnodexConfigInput): WnodexConfigOutput {
  const result = WnodexConfigSchema.safeParse(config);

  if (!result.success) {
    throw new ConfigError('Invalid Nodex Configuration', result.error);
  }

  return result.data;
}
