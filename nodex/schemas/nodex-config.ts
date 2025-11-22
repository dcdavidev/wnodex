import { z } from 'zod';

import { CompressionOptionsSchema } from './compression.js';
import { CookieParserOptionsSchema } from './cookie-parser.js';
import { CorsOptionsSchema } from './cors.js';
import { HelmetOptionsSchema } from './helmet.js';
import { HppOptionsSchema } from './hpp.js';
import { PassportSchema } from './passport.js';
import { PortSchema } from './port.js';
import { RateLimitOptionsSchema } from './rate-limit.js';
import { SessionOptionsSchema } from './session.js';

export const NodexConfigSchema = z.object({
  port: PortSchema,
  helmet: HelmetOptionsSchema,
  cors: CorsOptionsSchema,
  compression: CompressionOptionsSchema,
  rateLimit: RateLimitOptionsSchema,
  cookieParser: CookieParserOptionsSchema,
  hpp: HppOptionsSchema,
  session: SessionOptionsSchema,
  passport: PassportSchema,
});

export type NodexConfigInput = z.input<typeof NodexConfigSchema>;
export type NodexConfigOutput = z.output<typeof NodexConfigSchema>;
