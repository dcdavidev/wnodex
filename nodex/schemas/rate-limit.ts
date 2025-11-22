import { z } from 'zod';

import {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_MESSAGE,
  DEFAULT_RATE_LIMIT_OPTIONS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from '../consts/rate-limit.js';

export const RateLimitOptionsSchema = z
  .union([
    z.boolean(),
    z.object({
      windowMs: z
        .number()
        .int()
        .positive()
        .optional()
        .default(DEFAULT_RATE_LIMIT_WINDOW_MS),
      max: z
        .number()
        .int()
        .positive()
        .optional()
        .default(DEFAULT_RATE_LIMIT_MAX),
      message: z.string().optional().default(DEFAULT_RATE_LIMIT_MESSAGE),
    }),
  ])
  .optional()
  .default({ ...DEFAULT_RATE_LIMIT_OPTIONS });

export type RateLimitOptionsInput = z.input<typeof RateLimitOptionsSchema>;
export type RateLimitOptionsOutput = z.output<typeof RateLimitOptionsSchema>;
