import { ConfigError } from 'src/errors/config-error.js';
import {
  type NodexConfigInput,
  type NodexConfigOutput,
  NodexConfigSchema,
} from 'src/schemas/nodex-config.js';

/**
 * Validates the provided config using NodexConfigSchema.
 * Throws ValidationError if validation fails.
 * @param config Raw configuration input for Nodex.
 * @returns Validated configuration.
 * @throws {ConfigError} If configuration is invalid.
 * @example
 * const config = setupConfig(rawConfig);
 */
export function setupConfig(config: NodexConfigInput): NodexConfigOutput {
  const result = NodexConfigSchema.safeParse(config);

  if (!result.success) {
    throw new ConfigError('Invalid Nodex Configuration', result.error);
  }

  return result.data;
}
