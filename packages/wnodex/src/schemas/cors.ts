import type { CorsOptions } from 'cors';

import { z } from 'zod';

import { DEFAULT_CORS_OPTIONS } from '../consts/cors.js';

export const CorsOptionsSchema = z
  .union([z.boolean(), z.custom<CorsOptions>()])
  .optional()
  .default(DEFAULT_CORS_OPTIONS);

export type CorsOptionsInput = z.input<typeof CorsOptionsSchema>;
export type CorsOptionsOutput = z.output<typeof CorsOptionsSchema>;
