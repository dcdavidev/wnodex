import { z } from 'zod';

import {
  DEFAULT_PORT,
  MAX_PORT,
  MIN_PORT,
  RESERVED_PORTS,
} from '../consts/port.js';

export const PortSchema = z
  .union([
    z.string().regex(/^\d{4,5}$/),
    z.number().int().min(MIN_PORT).max(MAX_PORT),
  ])
  .transform((val) => (typeof val === 'string' ? Number(val) : val))
  .refine((port: number) => !RESERVED_PORTS[port], {
    message: 'The selected port is reserved for another application',
  })
  .optional()
  .default(DEFAULT_PORT);

export type PortInput = z.input<typeof PortSchema>;
