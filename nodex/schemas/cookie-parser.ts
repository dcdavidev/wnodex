import type { CookieParseOptions } from 'cookie-parser';

import { z } from 'zod';

export const CookieParserOptionsSchema = z
  .union([
    z.boolean(),
    z.object({
      secret: z.union([z.string(), z.array(z.string())]),
      options: z.custom<CookieParseOptions>().optional(),
    }),
  ])
  .optional()
  .default(true);

export type CookieParserOptionsInput = z.input<
  typeof CookieParserOptionsSchema
>;
export type CookieParserOptionsOutput = z.output<
  typeof CookieParserOptionsSchema
>;
