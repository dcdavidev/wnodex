import type { Application } from 'express';

import hpp from 'hpp';

import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Configures the hpp middleware protection against HTTP Parameter Pollution.
 *
 * Applies the hpp middleware to the Express application instance based on the
 * provided configuration. If configuration is a boolean and true, applies with default.
 * If configuration is an array, uses it as a whitelist of allowed duplicate parameters.
 * @param app The Express application instance.
 * @param config The normalized middleware configuration, specifying hpp options.
 * @returns Void.
 *
 * @example
 * configureHpp(app, { hpp: true });
 * configureHpp(app, { hpp: ['param1', 'param2'] });
 */
export function configureHpp(app: Application, config: NodexConfigOutput) {
  const { hpp: options } = config;

  if (typeof options === 'boolean') {
    if (options === false || !options) return;

    return app.use(hpp());
  } else {
    return app.use(hpp({ whitelist: [...options] }));
  }
}
