import { z } from 'zod';

import {
  DEFAULT_SESSION_COOKIE_HTTP_ONLY,
  DEFAULT_SESSION_COOKIE_MAX_AGE,
  DEFAULT_SESSION_COOKIE_SECURE,
  DEFAULT_SESSION_RESAVE,
  DEFAULT_SESSION_SAVE_UNINITIALIZED,
} from '../consts/session.js';

export const SessionCookieSchema = z
  .object({
    secure: z.boolean().optional().default(DEFAULT_SESSION_COOKIE_SECURE),
    maxAge: z.number().optional().default(DEFAULT_SESSION_COOKIE_MAX_AGE),
    httpOnly: z.boolean().optional().default(DEFAULT_SESSION_COOKIE_HTTP_ONLY),
  })
  .optional()
  .default({
    secure: DEFAULT_SESSION_COOKIE_SECURE,
    maxAge: DEFAULT_SESSION_COOKIE_MAX_AGE,
    httpOnly: DEFAULT_SESSION_COOKIE_HTTP_ONLY,
  });

export const SessionOptionsSchema = z
  .union([
    z.literal(false),
    z.object({
      secret: z.string(),
      resave: z.boolean().optional().default(DEFAULT_SESSION_RESAVE),
      saveUninitialized: z
        .boolean()
        .optional()
        .default(DEFAULT_SESSION_SAVE_UNINITIALIZED),
      cookie: SessionCookieSchema,
    }),
  ])
  .optional()
  .default(false);

export type SessionOptions = z.infer<typeof SessionOptionsSchema>;
