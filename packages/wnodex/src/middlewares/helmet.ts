/**
 * @file Helmet security headers middleware configuration.
 * @module middlewares/helmet
 */

import type { RequestHandler } from 'express';

import helmet, { type HelmetOptions } from 'helmet';

export type { HelmetOptions } from 'helmet';

/**
 * Creates Helmet middleware to secure Express apps by setting various HTTP headers.
 *
 * @param [options] - Optional Helmet configuration options.
 * @returns Configured Helmet RequestHandler.
 */
export function createHelmetMiddleware(
  options?: HelmetOptions
): RequestHandler {
  return helmet(options);
}

/**
 * Default Helmet middleware instance.
 */
export const helmetMiddleware: RequestHandler = createHelmetMiddleware();
