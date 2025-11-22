import type { Application } from 'express';
import cookieParser from 'cookie-parser';

import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Configures the cookie-parser middleware for the Express app based on the provided configuration.
 * @param app The Express application instance to configure.
 * @param config The application configuration object, which includes cookieParser options.
 * @returns Void.
 *
 * @example
 * ```
 * import express from 'express';
 * import { configureCookieParser } from './middlewares/cookie-parser';
 * import config from './config';
 *
 * const app = express();
 * configureCookieParser(app, config);
 * ```
 */
export function configureCookieParser(
  app: Application,
  config: NodexConfigOutput
) {
  const { cookieParser: options } = config;

  if (typeof options === 'boolean') {
    if (!options) return;
    return app.use(cookieParser());
  } else {
    const { secret, options: opts } = options;

    return app.use(cookieParser(secret, opts));
  }
}
