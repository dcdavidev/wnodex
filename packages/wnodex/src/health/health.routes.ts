/**
 * @file Health check routes (View layer) exposing HTTP endpoints.
 * @module health/health.routes
 */

import { Router } from 'express';

import { HealthController } from './health.controller.js';
import {
  HealthModel,
  healthModel as defaultHealthModel,
} from './health.model.js';
import type { HealthCheckOptions } from './health.types.js';

/**
 * Creates an Express router dedicated to health check endpoints.
 * When custom plugins are passed via `options.plugins`, a scoped `HealthModel`
 * inheriting from `defaultHealthModel` is created so per-app plugins do not
 * leak across independent application instances.
 *
 * @param [options] - Health check configuration options.
 * @returns Configured health router instance.
 */
export function createHealthRouter(options?: HealthCheckOptions): Router {
  const router: Router = Router();
  const model =
    options?.model ??
    (options?.plugins && options.plugins.length > 0
      ? new HealthModel(options.plugins, defaultHealthModel)
      : defaultHealthModel);

  if (options?.model && options.plugins) {
    for (const plugin of options.plugins) {
      model.registerPlugin(plugin);
    }
  }

  const controller = new HealthController(model);

  router.get('/', controller.getHealth);
  router.get('/live', controller.getLiveness);
  router.get('/ready', controller.getReadiness);

  return router;
}

/**
 * Default singleton instance of the health router.
 */
export const healthRouter: Router = createHealthRouter();
