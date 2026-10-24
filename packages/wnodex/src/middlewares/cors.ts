/**
 * @file Cross-Origin Resource Sharing (CORS) middleware configuration.
 * @module middlewares/cors
 */

import type { RequestHandler } from 'express';

import cors, { type CorsOptions } from 'cors';

import { config } from '../config/env.js';
import {
  DEFAULT_CORS_ALLOWED_HEADERS,
  DEFAULT_CORS_METHODS,
} from '../constants/index.js';

export type { CorsOptions } from 'cors';

/**
 * Creates a CORS configuration with default safe headers and configurable origin.
 *
 * @param [customOptions] - Optional custom CORS configuration options.
 * @returns Configured CORS options object.
 */
export function createCorsOptions(customOptions?: CorsOptions): CorsOptions {
  return {
    origin: config.corsOrigin,
    credentials: true,
    methods: [...DEFAULT_CORS_METHODS],
    allowedHeaders: [...DEFAULT_CORS_ALLOWED_HEADERS],
    ...customOptions,
  };
}

/**
 * Default CORS configuration options.
 */
export const corsOptions: CorsOptions = createCorsOptions();

/**
 * Creates Cross-Origin Resource Sharing (CORS) middleware.
 *
 * @param [options] - Optional CORS configuration.
 * @returns Configured CORS RequestHandler.
 */
export function createCorsMiddleware(options?: CorsOptions): RequestHandler {
  return cors(createCorsOptions(options));
}

/**
 * Default Cross-Origin Resource Sharing (CORS) middleware instance.
 */
export const corsMiddleware: RequestHandler = createCorsMiddleware();
