/**
 * @file Custom error class for configuration failures.
 * @module errors/config-error
 */

import { BaseError } from './base-error.js';
import { ERROR_CODES } from './error-codes.js';

/**
 * Represents issues occurring during loading, parsing, or applying application configuration.
 * Automatically sets the error code to `"CONFIG_ERROR"`.
 */
export class ConfigError extends BaseError {
  /**
   * Constructs a new ConfigError instance.
   *
   * @param message - Human-readable error message describing the configuration problem.
   * @param [cause] - Optional original error or value that triggered the failure.
   * @param [context] - Optional additional context data.
   */
  constructor(
    message: string,
    cause?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code: ERROR_CODES.CONFIG_ERROR,
      cause,
      context,
    });
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
