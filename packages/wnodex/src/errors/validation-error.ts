/**
 * @file Custom error class for input and schema validation failures.
 * @module errors/validation-error
 */

import { BaseError } from './base-error.js';
import { ERROR_CODES } from './error-codes.js';

/**
 * Used for input errors, schema violations, or data integrity issues.
 * Automatically sets the error code to `"VALIDATION_ERROR"`.
 */
export class ValidationError extends BaseError {
  /**
   * Constructs a new ValidationError instance.
   *
   * @param message - Human-readable error message describing what failed validation.
   * @param [cause] - Optional original error or validation detail.
   * @param [context] - Optional additional context data (e.g., invalid field name).
   */
  constructor(
    message: string,
    cause?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      cause,
      context,
    });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
