import { ERROR_CODES } from '../consts/error-codes.js';
import { BaseError } from './base-error.js';

/**
 * Custom error class for configuration failures.
 * Represents issues occurring during loading, parsing, or applying application configuration.
 * Automatically sets the error code to `"CONFIG_ERROR"`. Useful for problems involving environment
 * variables, config files, or settings.
 */
export class ConfigError extends BaseError {
  /**
   * Constructs a new ConfigError instance.
   * @param message The human-readable error message describing the configuration problem.
   * @param cause Optional original error or value that triggered the configuration failure, such as a file system or validation error.
   * @param context Optional additional context data, such as the config file path, setting name, or problematic value.
   *
   * @example
   * throw new ConfigError('Failed to load config file', readError, { file: './config.json' });
   */
  constructor(
    message: string,
    cause?: unknown,
    context?: Record<string | number | symbol, unknown>
  ) {
    super(message, {
      code: ERROR_CODES.CONFIG_ERROR,
      cause,
      context,
    });
  }
}
