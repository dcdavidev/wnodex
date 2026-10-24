/**
 * @file Health domain model coordinating diagnostics collection and plugin checks.
 * @module health/health.model
 */

import process from 'node:process';

import type { Application } from 'express';

import { config as defaultConfig } from '../config/env.js';
import { CRITICAL_HEAP_USAGE_RATIO } from '../constants/index.js';
import type {
  DetailedHealthReport,
  HealthPlugin,
  HealthPluginResult,
  LivenessReport,
  ReadinessReport,
} from './health.types.js';
import {
  getMemoryStats,
  getProcessStats,
  getSystemStats,
  getUptimeStats,
} from './system-metrics.js';

const FAILING_PLUGIN_STATUSES = new Set(['down', 'error', 'not_ready']);

/**
 * Internal evaluation summary returned by `evaluatePlugins`.
 */
interface PluginEvaluationSummary {
  services: Record<string, HealthPluginResult>;
  checks: Record<string, string>;
  overallHealthy: boolean;
  failureReason?: string;
}

/**
 * Determines whether a plugin status string indicates an unhealthy/failed check.
 *
 * @param status - Status string returned by a plugin.
 * @returns True if the status represents a down or failed state.
 */
function isFailingStatus(status: string): boolean {
  return FAILING_PLUGIN_STATUSES.has(status);
}

/**
 * Domain model managing health data, system metrics collection,
 * and extensible plugin checks.
 */
export class HealthModel {
  private readonly plugins = new Map<string, HealthPlugin>();
  private readonly parentModel?: HealthModel;

  /**
   * Initializes a new HealthModel instance.
   *
   * @param [initialPlugins] - Optional initial list of plugins to register.
   * @param [parentModel] - Optional parent model whose plugins are inherited dynamically.
   */
  constructor(initialPlugins?: HealthPlugin[], parentModel?: HealthModel) {
    this.parentModel = parentModel;
    if (initialPlugins) {
      for (const plugin of initialPlugins) {
        this.registerPlugin(plugin);
      }
    }
  }

  /**
   * Evaluates all active plugins for the given application instance in a single DRY pass.
   *
   * @param [app] - Optional Express application instance.
   * @returns Aggregated plugin statuses, check labels, and critical failure state.
   */
  private async evaluatePlugins(
    app?: Application
  ): Promise<PluginEvaluationSummary> {
    const plugins = this.collectPlugins(app);
    const services: Record<string, HealthPluginResult> = {};
    const checks: Record<string, string> = {};
    let isOverallHealthy = true;
    let failureReason: string | undefined;

    for (const plugin of plugins) {
      try {
        const result = await plugin.check(app);
        const pluginStatus = result.status ?? 'ok';
        services[plugin.name] = result;
        checks[plugin.name] = String(pluginStatus);

        if (plugin.critical && isFailingStatus(String(pluginStatus))) {
          isOverallHealthy = false;
          failureReason = `Critical check failed: ${plugin.name}`;
        }
      } catch (error) {
        const errorResult: HealthPluginResult = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
        services[plugin.name] = errorResult;
        checks[plugin.name] = 'error';

        if (plugin.critical) {
          isOverallHealthy = false;
          failureReason = `Critical check failed: ${plugin.name}`;
        }
      }
    }

    return {
      services,
      checks,
      overallHealthy: isOverallHealthy,
      failureReason,
    };
  }

  /**
   * Registers a custom health indicator plugin (e.g. database ping, redis probe).
   *
   * @param plugin - The health plugin instance.
   * @returns This model instance for chaining.
   */
  registerPlugin(plugin: HealthPlugin): this {
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  /**
   * Unregisters a health plugin by name.
   *
   * @param name - The name of the plugin to remove.
   * @returns True if the plugin existed and was removed.
   */
  unregisterPlugin(name: string): boolean {
    return this.plugins.delete(name);
  }

  /**
   * Retrieves a registered plugin by name.
   *
   * @param name - Plugin name identifier.
   * @returns The registered plugin, or undefined if not found.
   */
  getPlugin(name: string): HealthPlugin | undefined {
    return this.plugins.get(name) ?? this.parentModel?.getPlugin(name);
  }

  /**
   * Returns all currently registered plugins in this model (and any parent model).
   *
   * @returns Array of registered health plugins.
   */
  getPlugins(): HealthPlugin[] {
    const merged = new Map<string, HealthPlugin>();
    if (this.parentModel) {
      for (const plugin of this.parentModel.getPlugins()) {
        merged.set(plugin.name, plugin);
      }
    }
    for (const [name, plugin] of this.plugins.entries()) {
      merged.set(name, plugin);
    }
    return merged.values().toArray();
  }

  /**
   * Collects all active plugins from both model registry and application settings.
   *
   * @param [app] - Optional Express application instance to check for injected plugins.
   * @returns Combined array of plugins.
   */
  collectPlugins(app?: Application): HealthPlugin[] {
    const merged = new Map<string, HealthPlugin>();

    for (const plugin of this.getPlugins()) {
      merged.set(plugin.name, plugin);
    }

    if (app && typeof app.get === 'function') {
      const appPlugins = app.get('healthPlugins') as unknown;
      if (Array.isArray(appPlugins)) {
        for (const p of appPlugins) {
          if (
            p &&
            typeof p === 'object' &&
            'name' in p &&
            typeof p.name === 'string' &&
            'check' in p &&
            typeof p.check === 'function' &&
            !merged.has(p.name)
          ) {
            merged.set(p.name, p as HealthPlugin);
          }
        }
      }
    }

    return merged.values().toArray();
  }

  /**
   * Generates a Kubernetes liveness probe payload.
   *
   * @returns Liveness status report.
   */
  getLiveness(): LivenessReport {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Generates an extensible detailed system diagnostics report.
   * Reads environment configuration from the application settings or core config,
   * rather than reading process.env.NODE_ENV directly.
   *
   * @param serviceName - Service name identifier.
   * @param [app] - Optional Express application instance.
   * @returns Promise resolving to the detailed diagnostics report.
   */
  async getDetailedHealth(
    serviceName: string,
    app?: Application
  ): Promise<DetailedHealthReport> {
    const uptime = getUptimeStats();
    const { services, overallHealthy } = await this.evaluatePlugins(app);

    const environment =
      (app?.get('nodeEnv') as string | undefined) ??
      (app?.get('env') as string | undefined) ??
      defaultConfig.nodeEnv;

    const report: DetailedHealthReport = {
      status: overallHealthy ? 'ok' : 'degraded',
      service: serviceName,
      environment,
      timestamp: new Date().toISOString(),
      uptime,
      process: getProcessStats(),
      memory: getMemoryStats(),
      system: getSystemStats(),
    };

    if (Object.keys(services).length > 0) {
      report.services = services;
    }

    return report;
  }

  /**
   * Performs readiness checks (memory saturation and critical service plugins).
   *
   * @param [app] - Optional Express application instance.
   * @returns Readiness evaluation containing status code and payload.
   */
  async getReadiness(app?: Application): Promise<{
    isReady: boolean;
    statusCode: number;
    report: ReadinessReport;
  }> {
    const mem = process.memoryUsage();
    const heapUsageRatio = mem.heapUsed / mem.heapTotal;

    if (heapUsageRatio > CRITICAL_HEAP_USAGE_RATIO) {
      return {
        isReady: false,
        statusCode: 503,
        report: {
          status: 'not_ready',
          reason: 'Critical memory pressure',
          timestamp: new Date().toISOString(),
          checks: {
            memory: 'critical_saturation',
          },
        },
      };
    }

    const {
      services: details,
      checks: pluginChecks,
      overallHealthy: isReady,
      failureReason,
    } = await this.evaluatePlugins(app);

    const checks: Record<string, string> = {
      memory: 'ok',
      ...pluginChecks,
    };

    if (!isReady) {
      return {
        isReady: false,
        statusCode: 503,
        report: {
          status: 'not_ready',
          reason: failureReason,
          timestamp: new Date().toISOString(),
          checks,
          ...(Object.keys(details).length > 0 && { details }),
        },
      };
    }

    return {
      isReady: true,
      statusCode: 200,
      report: {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks,
        ...(Object.keys(details).length > 0 && { details }),
      },
    };
  }
}

/**
 * Default singleton instance of HealthModel.
 */
export const healthModel = new HealthModel();
