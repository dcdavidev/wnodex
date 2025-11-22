import type { Application } from 'express';

import session from 'express-session';

import type { WnodexConfigOutput } from '../schemas/wnodex-config.js';

/**
 * Configures the Express session middleware with the provided options.
 * Applies session management to the Express application, enabling
 * stateful sessions with cookies.
 * @param app The Express application instance.
 * @param config The validated configuration object containing session options.
 * @returns The Express Application instance with Session middleware applied,
 * or undefined if ession is disabled.
 *
 * @example
 * configureSession(app, { session: { secret: 'your-secret', resave: false, saveUninitialized: false } });
 */
export function configureSession(app: Application, config: WnodexConfigOutput) {
  const { session: options } = config;

  if (!options) return;

  return app.use(session({ ...options }));
}
