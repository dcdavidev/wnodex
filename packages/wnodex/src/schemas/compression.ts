import { z } from 'zod';

export const CompressionOptionsSchema = z.boolean().optional().default(true);

export type CompressionOptionsInput = z.input<typeof CompressionOptionsSchema>;
export type CompressionOptionsOutput = z.output<
  typeof CompressionOptionsSchema
>;
