/**
 * @file Base application error class with structured metadata and JSON serialization.
 * @module errors/base-error
 */

import { ERROR_CODES, type ErrorCode } from './error-codes.js';

/**
 * Structured metadata options for BaseError instances.
 */
export interface ErrorMetadata {
  /**
  Machine-readable error code
  */
  code?: ErrorCode;
  /**
  Optional underlying cause that triggered this error
  */
  cause?: unknown;
  /**
  Optional additional diagnostic context
  */
  context?: Record<string, unknown>;
}

/**
 * Base class for custom application errors.
 * Extends the native `Error` to preserve stack traces and adds structured metadata.
 */
export class BaseError extends Error {
  /**
  Machine-readable error code suitable for programmatic handling.
  */
  public readonly code: ErrorCode;

  /**
  Optional underlying cause that triggered this error instance.
  */
  public override readonly cause?: unknown;

  /**
  Additional error context for debugging or structured logging.
  */
  public readonly context?: Record<string, unknown>;

  /**
   * Initializes a new BaseError instance.
   *
   * @param message - Human-readable error message.
   * @param [metadata] - Structured metadata for this error instance.
   */
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, metadata?.cause ? { cause: metadata.cause } : undefined);
    this.name = new.target.name;
    this.code = metadata?.code ?? ERROR_CODES.INTERNAL_ERROR;
    this.cause = metadata?.cause;
    this.context = metadata?.context;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a plain, serializable object representation of the error.
   *
   * @returns Plain object suitable for JSON serialization or structured logging.
   */
  toJSON(): Record<string, unknown> {
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
      ...(normalizedCause !== undefined && { cause: normalizedCause }),
      ...(this.context !== undefined && { context: this.context }),
      ...(this.stack !== undefined && { stack: this.stack }),
    };
  }
}
