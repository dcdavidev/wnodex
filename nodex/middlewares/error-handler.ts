import type { NextFunction, Request, Response } from 'express';

import { isDevelopment } from 'src/helpers/is-development.js';

import type { HttpError } from '../errors/http-error.js';

/**
 * Middleware for centralized error handling.
 * Catches all errors thrown in the application and responds with a structured JSON.
 * Logs the error for debugging purposes.
 * @param err The thrown error object or value.
 * @param _req The current Express request object.
 * @param res The current Express response object.
 * @param _next Next middleware function in chain.
 *
 * @example
 * private setupMiddlewares() {
 *   // other middlewares
 *   // ...
 *   // Configure errorHandler as the last one middleware.
 *   app.use(errorHandler);
 * }
 */
export function errorHandler(
  err: HttpError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error for server debugging
  console.error(err);

  // Determine HTTP status code; default to 500 if unavailable
  const statusCode =
    typeof err === 'object' && err !== null && 'statusCode' in err
      ? err.statusCode
      : 500;

  // Get message or default to 'Internal Server Error'
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? err.message
      : 'Internal Server Error';

  // Send JSON response
  res.status(statusCode).json({
    error: {
      message,
      // Show stack trace only in development environment
      ...(isDevelopment() && {
        stack: err.stack,
      }),
    },
  });
}
