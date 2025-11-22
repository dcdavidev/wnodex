import type { Application } from 'express';

import type { NodexConfigInput } from 'src/schemas/nodex-config.js';

/**
 * Configures the passport instance.
 * @param app The express application instance.
 * @param config The Nodex raw config.
 * @returns The passport instance.
 * @example
 * construction(config: NodexConfigInput) {
 *   this.app = express();
 *   this.config = configureConfig(config);
 *   this.passport = configurePassport(this.app, this.config)
 * }
 */
export function configurePassport(app: Application, config: NodexConfigInput) {
  const { passport } = config;

  /**
   * If config.passport is either undefined, true (invalid config), or false, passport won't be instantiated.
   */
  if (!passport || typeof passport === 'boolean') return;

  app.set('passport', passport);
  app.use(passport.initialize());
  app.use(passport.session());

  return passport;
}
