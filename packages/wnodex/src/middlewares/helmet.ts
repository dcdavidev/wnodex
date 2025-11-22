import type { Application } from 'express';

import helmet from 'helmet';

import type { WnodexConfigOutput } from '../schemas/wnodex-config.js';

/**
 * Configures the Helmet middleware in an Express app.
 * @param app The Express Application instance on which to apply Helmet.
 * @param config Typed project configuration from which the Helmet option is read.
 *
 * @returns The Express Application instance (`app`) if Helmet is enable.
 *
 * @example
 * private setupMiddlewares() {
 *    configureHelmet(this.app, this.config);
 * }
 */
export function configureHelmet(app: Application, config: WnodexConfigOutput) {
  const { helmet: options } = config;

  if (typeof options === 'boolean') {
    if (options === false || !options) return;

    return app.use(helmet());
  } else {
    return app.use(helmet({ ...options }));
  }
}
