import type { Application } from 'express';
import rateLimit from 'express-rate-limit';

import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Configures the rate limiting middleware to protect the application
 * from excessive requests, mitigating abuse and denial of service attacks.
 *
 * It reads the `rateLimit` option from the provided config.
 * If it's a boolean:
 * - `false` disables rate limiting.
 * - `true` enables rate limiting with default settings.
 * If it's an object, it spreads the properties into the rateLimit options.
 * @param app Express Application instance to apply the rate limiter to.
 * @param config Typed application configuration object containing rateLimit option.
 *
 * @returns The result of `app.use(rateLimit())` if rate limiting is enabled, otherwise `undefined`.
 *
 * @example
 * private setupMiddlewares() {
 *    configureHelmet(this.app, this.config);
 * }
 */
export function configureRateLimit(
  app: Application,
  config: NodexConfigOutput
) {
  const { rateLimit: options } = config;

  if (typeof options === 'boolean') {
    if (options === false || !options) return;

    return app.use(rateLimit());
  } else {
    return app.use(rateLimit({ ...options }));
  }
}
