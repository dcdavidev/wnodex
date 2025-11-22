import { z } from 'zod';

import { ERROR_CODES } from '../consts/error-codes.js';

export const ErrorMetadataSchema = z
  .object({
    code: z.enum(Object.values(ERROR_CODES)),
    cause: z.unknown().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ErrorMetadata = z.infer<typeof ErrorMetadataSchema>;
export type ErrorMetadataInput = z.input<typeof ErrorMetadataSchema>;
export type ErrorMetadataOutput = z.output<typeof ErrorMetadataSchema>;
