/**
 * @file Health domain contracts, plugin interfaces, and configuration options.
 * @module health/health.types
 */

import type { Application } from 'express';

import type { HealthModel } from './health.model.js';
import type {
  MemoryStats,
  ProcessStats,
  SystemStats,
  UptimeStats,
} from './system-metrics.js';

export type {
  MemoryStats,
  ProcessStats,
  SystemStats,
  UptimeStats,
} from './system-metrics.js';

/**
 * Result returned by a health indicator/plugin.
 */
export interface HealthPluginResult {
  /**
  Health status string (e.g. 'ok', 'up', 'down', 'error', 'degraded')
  */
  status: 'ok' | 'up' | 'down' | 'error' | 'degraded' | string;
  /**
  Optional latency in milliseconds
  */
  latencyMs?: number;
  /**
  Optional error message
  */
  error?: string;
  /**
  Optional human-readable message
  */
  message?: string;
  /**
  Additional custom diagnostic details
  */
  [key: string]: unknown;
}

/**
 * Extensible health indicator/plugin interface.
 * Can be used for checking external dependencies (e.g., database ping, redis, auth providers).
 */
export interface HealthPlugin {
  /**
  Unique name identifier for the plugin (e.g. 'database', 'redis', 'cache')
  */
  name: string;
  /**
   * Diagnostic probe function returning status or metrics.
   * Can access the Express application instance if needed.
   */
  check: (
    app?: Application
  ) => Promise<HealthPluginResult> | HealthPluginResult;
  /**
   * If true, failure of this plugin affects overall readiness (HTTP 503).
   * Defaults to false.
   */
  critical?: boolean;
}

/**
 * Detailed diagnostics report returned by the root health endpoint.
 */
export interface DetailedHealthReport {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  environment: string;
  timestamp: string;
  uptime: UptimeStats;
  process: ProcessStats;
  memory: MemoryStats;
  system: SystemStats;
  services?: Record<string, HealthPluginResult>;
  [key: string]: unknown;
}

/**
 * Response structure for the Kubernetes liveness probe.
 */
export interface LivenessReport {
  status: 'alive';
  timestamp: string;
  uptimeSeconds: number;
}

/**
 * Response structure for the Kubernetes readiness probe.
 */
export interface ReadinessReport {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: Record<string, string>;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Configuration options to customize and extend health check endpoints.
 */
export interface HealthCheckOptions {
  /**
  Mount path for health check endpoints (default: '/health')
  */
  path?: string;
  /**
  Additional health indicator plugins to register
  */
  plugins?: HealthPlugin[];
  /**
  Optional custom HealthModel instance
  */
  model?: HealthModel;
}
