/**
 * @file Centralized error handling and 404 fallback middlewares.
 * @module middlewares/error-handler
 */

import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';

import type { Logger } from 'pino';

import { config } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { logger as defaultLogger } from '../logger/logger.js';

export {
  BaseError,
  ConfigError,
  ERROR_CODES,
  type ErrorCode,
  type ErrorMetadata,
  HttpError,
  ValidationError,
} from '../errors/index.js';

/**
 * Creates a 404 Not Found fallback handler.
 *
 * @param [customMessage] - Optional custom message or callback.
 * @returns Configured RequestHandler.
 */
export function createNotFoundHandler(
  customMessage?: string | ((req: Request) => string)
): RequestHandler {
  return (req: Request, res: Response): void => {
    const message =
      typeof customMessage === 'function'
        ? customMessage(req)
        : (customMessage ?? `Cannot ${req.method} ${req.originalUrl}`);

    res.status(404).json({
      status: 404,
      error: 'Not Found',
      message,
    });
  };
}

/**
 * Default fallback middleware for unhandled route paths (404 Not Found).
 */
export const notFoundHandler: RequestHandler = createNotFoundHandler();

/**
 * Options for configuring the global error handler middleware.
 */
export interface ErrorHandlerOptions {
  /**
  Whether to output stack traces in error responses
  */
  isDevelopment?: boolean;
  /**
  Whether to hide internal 500 error messages in responses
  */
  isProduction?: boolean;
  /**
  Custom logger instance
  */
  logger?: Logger;
}

/**
 * Creates global error-handling middleware.
 * Catches all errors forwarded by `next(err)`, logs them, and formats a consistent JSON response.
 *
 * @param [options] - Optional error handler options.
 * @returns Configured ErrorRequestHandler.
 */
export function createErrorHandler(
  options?: ErrorHandlerOptions
): ErrorRequestHandler {
  const isDev = options?.isDevelopment ?? config.isDevelopment;
  const isProd = options?.isProduction ?? config.isProduction;
  const activeLogger = options?.logger ?? defaultLogger;

  return (
    err: Error | HttpError,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    const statusCode =
      'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;

    activeLogger.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
        statusCode,
      },
      `Unhandled error caught during request processing: ${err.message}`
    );

    if (res.headersSent) {
      return;
    }

    res.status(statusCode).json({
      status: statusCode,
      error: err.name || 'InternalServerError',
      message:
        statusCode === 500 && isProd
          ? 'An internal server error occurred.'
          : err.message,
      ...(isDev && { stack: err.stack }),
    });
  };
}

/**
 * Default global error-handling middleware instance.
 */
export const errorHandler: ErrorRequestHandler = createErrorHandler();
