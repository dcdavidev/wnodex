/**
 * @file HTTP Parameter Pollution (HPP) protection middleware configuration.
 * @module middlewares/hpp
 */

import type { RequestHandler } from 'express';

import hpp, { type Options as HppOptions } from 'hpp';

export type { Options as HppOptions } from 'hpp';

/**
 * Creates HTTP Parameter Pollution (HPP) middleware to protect against parameter pollution attacks.
 *
 * @param [options] - Optional HPP options or array of whitelisted query parameters.
 * @returns Configured HPP RequestHandler.
 */
export function createHppMiddleware(
  options?: HppOptions | string[]
): RequestHandler {
  return hpp(Array.isArray(options) ? { whitelist: [...options] } : options);
}

/**
 * Default HTTP Parameter Pollution (HPP) middleware instance.
 */
export const hppMiddleware: RequestHandler = createHppMiddleware();
