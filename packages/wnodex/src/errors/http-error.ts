/**
 * @file Custom HTTP error class with numerical status code and factory helpers.
 * @module errors/http-error
 */

import { BaseError, type ErrorMetadata } from './base-error.js';
import { ERROR_CODES, type ErrorCode } from './error-codes.js';

/**
 * Maps common HTTP status codes to default machine-readable error codes.
 *
 * @param statusCode - Numerical HTTP status code.
 * @returns Default ErrorCode corresponding to the status code.
 */
function defaultErrorCodeForStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400: {
      return ERROR_CODES.BAD_REQUEST;
    }
    case 401: {
      return ERROR_CODES.UNAUTHORIZED;
    }
    case 403: {
      return ERROR_CODES.FORBIDDEN;
    }
    case 404: {
      return ERROR_CODES.NOT_FOUND;
    }
    case 409: {
      return ERROR_CODES.CONFLICT;
    }
    case 422: {
      return ERROR_CODES.VALIDATION_ERROR;
    }
    case 429: {
      return ERROR_CODES.TOO_MANY_REQUESTS;
    }
    default: {
      return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}

/**
 * Custom application HTTP error class.
 * Supports both `(statusCode, message, metadata?)` and `(message, statusCode?, metadata?)` signatures.
 */
export class HttpError extends BaseError {
  /**
   * Creates a 400 Bad Request HttpError.
   *
   * @param [message] - Diagnostic message explaining why the request was invalid.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static badRequest(
    message = 'Bad Request',
    metadata?: ErrorMetadata
  ): HttpError {
    return new HttpError(400, message, metadata);
  }

  /**
   * Creates a 401 Unauthorized HttpError.
   *
   * @param [message] - Diagnostic message explaining why authentication failed.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static unauthorized(
    message = 'Unauthorized',
    metadata?: ErrorMetadata
  ): HttpError {
    return new HttpError(401, message, metadata);
  }

  /**
   * Creates a 403 Forbidden HttpError.
   *
   * @param [message] - Diagnostic message explaining why access was denied.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static forbidden(message = 'Forbidden', metadata?: ErrorMetadata): HttpError {
    return new HttpError(403, message, metadata);
  }

  /**
   * Creates a 404 Not Found HttpError.
   *
   * @param [message] - Diagnostic message identifying the missing resource.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static notFound(message = 'Not Found', metadata?: ErrorMetadata): HttpError {
    return new HttpError(404, message, metadata);
  }

  /**
   * Creates a 409 Conflict HttpError.
   *
   * @param [message] - Diagnostic message describing the state conflict.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static conflict(message = 'Conflict', metadata?: ErrorMetadata): HttpError {
    return new HttpError(409, message, metadata);
  }

  /**
   * Creates a 429 Too Many Requests HttpError.
   *
   * @param [message] - Diagnostic message indicating rate limit exhaustion.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static tooManyRequests(
    message = 'Too Many Requests',
    metadata?: ErrorMetadata
  ): HttpError {
    return new HttpError(429, message, metadata);
  }

  /**
   * Creates a 500 Internal Server Error HttpError.
   *
   * @param [message] - Diagnostic message describing the unexpected server fault.
   * @param [metadata] - Structured metadata and context for the error.
   * @returns Configured HttpError instance.
   */
  static internal(
    message = 'Internal Server Error',
    metadata?: ErrorMetadata
  ): HttpError {
    return new HttpError(500, message, metadata);
  }

  /**
  Numerical HTTP status code returned to the client.
  */
  public statusCode: number;

  /**
   * Initializes a new HTTP error instance with a status code and diagnostic message.
   *
   * @param statusCode - Numerical status code representing the client or server fault.
   * @param message - Descriptive message detailing the underlying failure.
   * @param [metadata] - Optional structured error metadata.
   */
  constructor(statusCode: number, message: string, metadata?: ErrorMetadata);

  /**
   * Initializes a new HTTP error instance with a message and optional status code (legacy wnodex signature).
   *
   * @param message - Descriptive message detailing the underlying failure.
   * @param [statusCode] - Numerical status code (defaults to 500).
   * @param [metadata] - Optional structured error metadata.
   */
  constructor(message: string, statusCode?: number, metadata?: ErrorMetadata);

  constructor(
    statusCodeOrMessage: number | string,
    messageOrStatusCode?: string | number,
    metadata?: ErrorMetadata
  ) {
    const isStatusFirst = typeof statusCodeOrMessage === 'number';
    const statusCode = isStatusFirst
      ? statusCodeOrMessage
      : typeof messageOrStatusCode === 'number'
        ? messageOrStatusCode
        : 500;
    const message = isStatusFirst
      ? String(messageOrStatusCode ?? 'HTTP Error')
      : statusCodeOrMessage;

    super(message, {
      code: metadata?.code ?? defaultErrorCodeForStatus(statusCode),
      cause: metadata?.cause,
      context: metadata?.context,
    });

    this.name = 'HttpError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
