import express, { type Application } from 'express';

import { configureCompression } from '../middlewares/compression.js';
import { configureCookieParser } from '../middlewares/cookie-parser.ts.js';
import { configureCors } from '../middlewares/cors.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { configureHelmet } from '../middlewares/helmet.js';
import { configureHpp } from '../middlewares/hpp.js';
import { configurePassport } from '../middlewares/passport.js';
import { configureRateLimit } from '../middlewares/rate-limit.js';
import { configureSession } from '../middlewares/session.js';
import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Sets up Express middlewares for the application.
 * Currently applies the helmet security middleware.
 * @param app The express application instance.
 * @param config The Nodex parsed config object.
 * @example
 * this.config = setupMiddlewares();
 */
export function setupMiddlewares(
  app: Application,
  config: NodexConfigOutput
): void {
  // Helmet
  configureHelmet(app, config);

  // CORS
  configureCors(app, config);

  // Body Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // cookie-parser
  configureCookieParser(app, config);

  // compression
  configureCompression(app, config);

  // express-rate-limit
  configureRateLimit(app, config);

  // hpp
  configureHpp(app, config);

  // express-session - Session management
  configureSession(app, config);

  // passport - Authentication middleware
  configurePassport(app, config);

  // Error Handler (keep it last)
  app.use(errorHandler);
}
