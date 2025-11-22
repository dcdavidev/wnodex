import type { Application } from 'express';
import cors from 'cors';

import type { NodexConfigOutput } from '../schemas/nodex-config.js';

/**
 * Configures the CORS middleware for an Express application.
 * Reads the `cors` option from the provided config.
 * If the option is a boolean:
 * - `false` disables CORS middleware.
 * - `true` enables CORS middleware with default settings.
 * If the option is an object, it is spread into the CORS middleware options.
 * @param app The Express Application instance to attach middleware to.
 * @param config Typed configuration input that includes the CORS option.
 *
 * @returns The Express Application instance with CORS middleware applied,
 * or undefined if CORS is disabled.
 *
 * @example
 * private setupMiddlewares() {
 *    configureCors(this.app, this.config);
 * }
 */
export function configureCors(app: Application, config: NodexConfigOutput) {
  const { cors: options } = config;

  if (typeof options === 'boolean') {
    if (options === false || !options) return;

    return app.use(cors());
  } else {
    return app.use(cors({ ...options }));
  }
}
