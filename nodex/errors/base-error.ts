import type {
  ErrorMetadataInput,
  ErrorMetadataOutput,
} from '../schemas/error-metadata.js';
import { ErrorMetadataSchema } from '../schemas/error-metadata.js';

/**
 * Base class for all custom application errors.
 * Extends the native `Error` to preserve stack traces and adds structured, validated metadata.
 *
 * Provides consistent error information for debugging and structured logging.
 */
export class BaseError extends Error {
  /**
   * The machine-readable error code, suitable for programmatic handling.
   * @readonly
   */
  public readonly code: string;

  /**
   * The optional cause that triggered this error instance.
   * May be any value, but usually another Error object for chained errors.
   * @override
   * @readonly
   */
  public override readonly cause?: unknown;

  /**
   * Additional error context for debugging (may contain any serializable data).
   * @readonly
   */
  public readonly context?: unknown;

  /**
   * Constructs a new instance of BaseError.
   * Validates the provided metadata to ensure it matches the ErrorMetadataSchema.
   * @param message The human-readable error message.
   * @param metadata Structured metadata for this error instance. It will be validated.
   * @throws {Error} Throws if the metadata is invalid according to ErrorMetadataSchema.
   * @example
   * const err = new BaseError('User not found', { code: 'USER_NOT_FOUND' });
   */
  constructor(message: string, metadata: ErrorMetadataInput) {
    super(message);

    // Sets the name property to the actual class name (useful with inheritance).
    this.name = new.target.name;

    const validatedMetadata = this.validateMetadata(metadata, message);

    this.code = validatedMetadata.code;
    this.cause = validatedMetadata.cause;
    this.context = validatedMetadata.context;

    // Ensures proper prototype chain for custom errors (required for ES5/TypeScript).
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Validates the error metadata using ErrorMetadataSchema.
   * Throws a clear error if validation fails, including the original Zod error as the cause.
   * @param input The raw metadata input.
   * @param parentErrorMessage The message of the error being constructed, for improved diagnostics.
   * @returns {ErrorMetadataOutput} Parsed and validated metadata.
   * @throws {Error} If the metadata does not pass validation.
   * @example
   * this.validateMetadata({ code: 'INVALID', context: { foo: 42 } }, 'Something failed');
   */
  private validateMetadata(
    input: ErrorMetadataInput,
    parentErrorMessage: string
  ): ErrorMetadataOutput {
    const result = ErrorMetadataSchema.safeParse(input);

    if (!result.success) {
      const errorMessage = `Invalid metadata provided for error "${parentErrorMessage}" (Code: ${input.code || 'N/A'}).`;

      throw new Error(errorMessage, { cause: result.error });
    }

    return result.data;
  }

  /**
   * Returns a plain object representation of the error,
   * useful for structured logging, serialization, or external error reporting.
   * Nested error causes include their name, message, and stack trace.
   * @returns {object} A plain, serializable object representing this error.
   * @example
   * JSON.stringify(err.toJSON());
   */
  toJSON(): object {
    const normalizedCause =
      this.cause instanceof Error
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : this.cause;

    return {
      name: this.name,
      message: this.message,
      code: this.code,
      cause: normalizedCause,
      context: this.context,
      stack: this.stack,
    };
  }
}
