/**
 * @file Rate limiting middleware to protect the application from brute-force and DoS attacks.
 * @module middlewares/rate-limiter
 */

import type { Request, Response } from 'express';

import {
  type Options as RateLimitOptions,
  rateLimit,
  type RateLimitRequestHandler,
} from 'express-rate-limit';

import { config } from '../config/env.js';

/**
 * Creates a rate limiting middleware configured with specified or default thresholds.
 *
 * @param [customOptions] - Optional configuration overrides for the rate limiter.
 * @returns Configured RateLimitRequestHandler instance.
 */
export function createRateLimiter(
  customOptions?: Partial<RateLimitOptions>
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
      status: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
    handler: (_req: Request, res: Response, _next, options) => {
      res.status(options.statusCode).json(options.message);
    },
    ...customOptions,
  });
}

/**
 * Global default rate limiter middleware.
 */
export const rateLimiter: RateLimitRequestHandler = createRateLimiter();

export { type Options as RateLimitOptions } from 'express-rate-limit';
