/**
 * @file Database and generic service health check plugin factories.
 * @module health/database.plugin
 */

import type { HealthPlugin } from './health.types.js';

/**
 * Options for configuring a probe-based health check plugin.
 */
export interface HealthProbePluginOptions {
  /**
  Custom name for the plugin (default: 'database' for database plugin)
  */
  name?: string;
  /**
  Whether failure of this check should trigger HTTP 503 readiness failure (default: true)
  */
  critical?: boolean;
}

/**
 * Generic factory helper to construct a latency-aware health plugin from an async ping/probe function.
 *
 * @param name - Default plugin identifier (e.g., 'database', 'redis', 'cache').
 * @param pingFn - Async function performing the service ping or probe.
 * @param [options] - Plugin configuration options.
 * @returns Configured HealthPlugin.
 */
export function createHealthProbePlugin(
  name: string,
  pingFn: () => Promise<boolean | void> | boolean | void,
  options?: HealthProbePluginOptions
): HealthPlugin {
  return {
    name: options?.name ?? name,
    critical: options?.critical ?? true,
    async check() {
      const start = Date.now();
      try {
        const result = await pingFn();
        const latencyMs = Date.now() - start;
        return {
          status: result === false ? 'down' : 'up',
          latencyMs,
        };
      } catch (error) {
        return {
          status: 'down',
          latencyMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Factory helper to construct a database health plugin (e.g. for PostgreSQL, Prisma, MongoDB, etc.).
 *
 * @param pingFn - Async function performing the database ping or query.
 * @param [options] - Plugin configuration options.
 * @returns Configured HealthPlugin.
 */
export function createDatabaseHealthPlugin(
  pingFn: () => Promise<boolean | void> | boolean | void,
  options?: HealthProbePluginOptions
): HealthPlugin {
  return createHealthProbePlugin('database', pingFn, options);
}
