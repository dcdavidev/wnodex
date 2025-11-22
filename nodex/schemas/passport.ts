import passport from 'passport';

import { z } from 'zod';

export const PassportSchema = z
  .union([z.literal(false), z.custom<typeof passport>()])
  .optional()
  .default(false);

export type PassportInput = z.input<typeof PassportSchema>;
export type PassportOutput = z.output<typeof PassportSchema>;
