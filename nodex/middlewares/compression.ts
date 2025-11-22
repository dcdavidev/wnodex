import type { Application } from 'express';

import compression from 'compression';

import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Configures compression middleware to compress HTTP responses,
 * improving network performance by reducing response size.
 * Reads a flag from the app configuration to enable or disable compression.
 * @param app Express Application instance to apply compression middleware on.
 * @param config Typed Nodex configuration object containing compression option.
 *
 * @returns The result of app.use(compression()) if enabled, otherwise undefined.
 *
 * @example
 * private setupMiddlewares() {
 *    configureCors(this.app, this.config);
 * }
 */
export function configureCompression(
  app: Application,
  config: NodexConfigOutput
) {
  const { compression: isCompressionEnabled } = config;

  if (!isCompressionEnabled) {
    return;
  }

  return app.use(compression());
}
