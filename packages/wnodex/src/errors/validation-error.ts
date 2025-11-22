import { ERROR_CODES } from '../consts/error-codes.js';
import { BaseError } from './base-error.js';

/**
 * Custom error class for validation failures.
 * Used for input errors, schema violations, or data integrity issues.
 * Automatically sets the error code to `"VALIDATION_ERROR"` to allow standard handling of validation errors.
 */
export class ValidationError extends BaseError {
  /**
   * Constructs a new ValidationError instance.
   * @param message The human-readable error message describing what failed validation.
   * @param cause Optional original error or value that caused the validation failure, such as a ZodError or validation detail.
   * @param context Optional additional context data, for example the invalid field, config path, or offending input.
   *
   * @example
   * throw new ValidationError('Invalid email format', zodResult.error, { field: 'email' });
   */
  constructor(
    message: string,
    cause?: unknown,
    context?: Record<string | number | symbol, unknown>
  ) {
    super(message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      cause,
      context,
    });
  }
}
