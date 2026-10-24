/**
 * @file Response compression middleware (gzip/deflate/brotli).
 * @module middlewares/compression
 */

import type { RequestHandler } from 'express';

import compression, { type CompressionOptions } from 'compression';

export type { CompressionOptions } from 'compression';

/**
 * Creates response compression middleware.
 *
 * @param [options] - Optional compression configuration options.
 * @returns Configured compression RequestHandler.
 */
export function createCompressionMiddleware(
  options?: CompressionOptions
): RequestHandler {
  return compression(options);
}

/**
 * Default response compression middleware instance.
 */
export const compressionMiddleware: RequestHandler =
  createCompressionMiddleware();
