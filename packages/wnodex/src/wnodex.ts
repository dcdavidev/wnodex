/**
 * @file Object-oriented Wnodex server class built on top of the modular core factories.
 * @module wnodex
 */

import type { Server } from 'node:http';
import process from 'node:process';

import type { Express } from 'express';

import type { Logger } from 'pino';

import { createApp, type CreateAppOptions } from './app.js';
import { loadConfig, type ServerConfig } from './config/env.js';
import { DEFAULT_SERVICE_NAME } from './constants/index.js';
import type { HealthCheckOptions, HealthPlugin } from './health/index.js';
import { createLogger } from './logger/logger.js';
import type { BodyParserOptions } from './middlewares/body-parser.js';
import type { CompressionOptions } from './middlewares/compression.js';
import type {
  CookieParseOptions,
  CookieParserOptions,
} from './middlewares/cookie-parser.js';
import type { CorsOptions } from './middlewares/cors.js';
import type { HelmetOptions } from './middlewares/helmet.js';
import type { HppOptions } from './middlewares/hpp.js';
import type {
  PassportMiddlewareOptions,
  PassportStatic,
} from './middlewares/passport.js';
import type { RateLimitOptions } from './middlewares/rate-limiter.js';
import type { SessionMiddlewareOptions } from './middlewares/session.js';
import type { StaticAssetsOptions } from './middlewares/static.js';
import type { CreateServerOptions } from './server.js';
import {
  type CleanupHook,
  closeServerGracefully,
  setupGracefulShutdown,
} from './server/shutdown.js';

/**
 * Configuration options accepted by the `Wnodex` class constructor.
 * Combines `CreateServerOptions` with convenient top-level overrides and shorthand middleware toggles.
 */
export interface WnodexOptions
  extends
    Omit<CreateServerOptions, 'config' | 'logger'>,
    Partial<ServerConfig> {
  /**
  Optional pre-built ServerConfig instance
  */
  config?: ServerConfig;
  /**
  Optional custom Pino logger instance
  */
  logger?: Logger;
  /**
  Shorthand to enable/disable or configure Helmet (`boolean | HelmetOptions`)
  */
  helmet?: boolean | HelmetOptions;
  /**
  Shorthand to enable/disable or configure CORS (`boolean | CorsOptions`)
  */
  cors?: boolean | CorsOptions;
  /**
  Shorthand to enable/disable or configure response compression (`boolean | CompressionOptions`)
  */
  compression?: boolean | CompressionOptions;
  /**
  Shorthand to enable/disable or configure body parsers (`boolean | BodyParserOptions`)
  */
  bodyParsers?: boolean | BodyParserOptions;
  /**
  Shorthand to enable/disable or configure cookie-parser (`boolean | CookieParserOptions | CookieParseOptions | string | string[]`)
  */
  cookieParser?:
    boolean | CookieParserOptions | CookieParseOptions | string | string[];
  /**
  Shorthand to enable/disable or configure HPP (`boolean | HppOptions | string[]`)
  */
  hpp?: boolean | HppOptions | string[];
  /**
  Shorthand to enable/disable or configure rate limiting (`boolean | Partial&lt;RateLimitOptions>`)
  */
  rateLimit?: boolean | Partial<RateLimitOptions>;
  /**
  Shorthand to disable or configure express-session (`false | SessionMiddlewareOptions`)
  */
  session?: false | SessionMiddlewareOptions;
  /**
  Shorthand to enable/disable or configure Passport (`boolean | PassportMiddlewareOptions | PassportStatic`)
  */
  passport?: boolean | PassportMiddlewareOptions | PassportStatic;
  /**
  Shorthand to enable/disable or configure health checks (`boolean | HealthCheckOptions`)
  */
  healthCheck?: boolean | HealthCheckOptions;
  /**
  Shorthand to configure static asset serving (`string | StaticAssetsOptions`)
  */
  staticAssets?: string | StaticAssetsOptions;
  /**
  Whether to automatically attach OS signal handlers on `start()` (default: false for manual control, true if requested)
  */
  autoSignalShutdown?: boolean;
}

/**
 * Normalizes `WnodexOptions` into `CreateAppOptions` without duplicating middleware logic.
 *
 * @param options - User-supplied Wnodex constructor options.
 * @param resolvedConfig - Resolved server configuration object.
 * @param resolvedLogger - Active Pino logger instance.
 * @returns Normalized options ready for `createApp`.
 */
function normalizeAppOptions(
  options: WnodexOptions | undefined,
  resolvedConfig: ServerConfig,
  resolvedLogger: Logger
): CreateAppOptions {
  const enableHelmet =
    options?.enableHelmet ??
    (typeof options?.helmet === 'boolean' ? options.helmet : true);
  const helmetOptions =
    options?.helmetOptions ??
    (typeof options?.helmet === 'object' ? options.helmet : undefined);

  const enableCors =
    options?.enableCors ??
    (typeof options?.cors === 'boolean' ? options.cors : true);
  const corsOptions =
    options?.corsOptions ??
    (typeof options?.cors === 'object' ? options.cors : undefined);

  const enableCompression =
    options?.enableCompression ??
    (typeof options?.compression === 'boolean'
      ? options.compression
      : options?.compression !== undefined ||
        options?.compressionOptions !== undefined);
  const compressionOptions =
    options?.compressionOptions ??
    (typeof options?.compression === 'object'
      ? options.compression
      : undefined);

  const enableBodyParser =
    options?.enableBodyParser ??
    (typeof options?.bodyParsers === 'boolean' ? options.bodyParsers : true);
  const bodyParserOptions =
    options?.bodyParserOptions ??
    (typeof options?.bodyParsers === 'object'
      ? options.bodyParsers
      : undefined);
  const bodyLimit =
    options?.bodyLimit ??
    (typeof bodyParserOptions?.limit === 'string'
      ? bodyParserOptions.limit
      : undefined) ??
    resolvedConfig.bodyLimit;

  const enableCookieParser =
    options?.enableCookieParser ??
    (typeof options?.cookieParser === 'boolean'
      ? options.cookieParser
      : options?.cookieParser !== undefined ||
        options?.cookieParserOptions !== undefined);
  const cookieParserOptions =
    options?.cookieParserOptions ??
    (typeof options?.cookieParser === 'boolean'
      ? undefined
      : options?.cookieParser);

  const enableHpp =
    options?.enableHpp ??
    (typeof options?.hpp === 'boolean' ? options.hpp : true);
  const hppOptions =
    options?.hppOptions ??
    (typeof options?.hpp === 'object' ? options.hpp : undefined);

  const enableRateLimit =
    options?.enableRateLimit ??
    (typeof options?.rateLimit === 'boolean' ? options.rateLimit : true);
  const rateLimitOptions =
    options?.rateLimitOptions ??
    (typeof options?.rateLimit === 'object' ? options.rateLimit : undefined);

  const enableSession =
    options?.enableSession ??
    (options?.session !== false &&
      (options?.session !== undefined ||
        options?.sessionOptions !== undefined));
  const sessionOptions =
    options?.sessionOptions ??
    (typeof options?.session === 'object' ? options.session : undefined);

  const enablePassport =
    options?.enablePassport ??
    (typeof options?.passport === 'boolean'
      ? options.passport
      : options?.passport !== undefined ||
        options?.passportOptions !== undefined);
  const passportOptions =
    options?.passportOptions ??
    (typeof options?.passport === 'object' ? options.passport : undefined);

  const enableHealthCheck =
    options?.enableHealthCheck ??
    (typeof options?.healthCheck === 'boolean' ? options.healthCheck : true);
  const healthOptions =
    options?.healthOptions ??
    (typeof options?.healthCheck === 'object'
      ? options.healthCheck
      : undefined);

  const staticOptions = options?.staticOptions ?? options?.staticAssets;

  return {
    ...options,
    config: resolvedConfig,
    logger: resolvedLogger,
    enableHelmet,
    helmetOptions,
    enableCors,
    corsOptions,
    enableCompression,
    compressionOptions,
    enableBodyParser,
    bodyLimit,
    bodyParserOptions,
    enableCookieParser,
    cookieParserOptions,
    enableHpp,
    hppOptions,
    enableRateLimit,
    rateLimitOptions,
    enableSession,
    sessionOptions,
    enablePassport,
    passportOptions,
    enableHealthCheck,
    healthOptions,
    staticOptions,
  };
}

/**
 * Main object-oriented server class for Wnodex.
 * Orchestrates Express application setup, configuration, structured logging,
 * extensible health checks, startup, and graceful shutdown using the core functional primitives.
 */
export class Wnodex {
  private readonly app: Express;
  private readonly config: ServerConfig;
  private readonly logger: Logger;
  private readonly options: WnodexOptions;
  private server?: Server;

  /**
   * Constructs a new Wnodex server instance.
   *
   * @param [options] - Configuration and middleware options for Wnodex.
   */
  constructor(options: WnodexOptions = {}) {
    this.options = options;
    this.config = options.config ?? loadConfig(options);
    this.logger =
      options.logger ??
      createLogger({
        level: this.config.logLevel,
        isDevelopment: this.config.isDevelopment,
        isTest: this.config.isTest,
      });

    this.app = createApp(
      normalizeAppOptions(options, this.config, this.logger)
    );
  }

  /**
   * Returns the underlying Express application instance.
   *
   * @returns Configured Express application.
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Returns the resolved server configuration.
   *
   * @returns ServerConfig object.
   */
  public getConfig(): ServerConfig {
    return this.config;
  }

  /**
   * Returns the active Pino logger instance.
   *
   * @returns Pino Logger instance.
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Returns the underlying Node.js HTTP server if currently running.
   *
   * @returns Running HTTP Server instance, or undefined if not started.
   */
  public getServer(): Server | undefined {
    return this.server;
  }

  /**
   * Registers an additional health check plugin on this application instance.
   *
   * @param plugin - Health check plugin to register.
   * @returns This Wnodex instance for chaining.
   */
  public registerHealthPlugin(plugin: HealthPlugin): this {
    const existing =
      (this.app.get('healthPlugins') as HealthPlugin[] | undefined) ?? [];
    this.app.set('healthPlugins', [
      ...existing.filter((p) => p.name !== plugin.name),
      plugin,
    ]);
    return this;
  }

  /**
   * Starts the Wnodex HTTP server and listens on the configured host and port.
   *
   * @returns Promise resolving to the running HTTP Server instance once listening.
   */
  public start(): Promise<Server> {
    const { host, port, nodeEnv } = this.config;
    const serviceName =
      this.options.serviceName ??
      (this.app.get('serviceName') as string | undefined) ??
      this.config.serviceName ??
      DEFAULT_SERVICE_NAME;

    return new Promise((resolve, reject) => {
      const srv = this.app.listen(port, host, () => {
        this.logger.info(
          {
            host,
            port,
            nodeEnv,
            pid: process.pid,
          },
          `🚀 ${serviceName} started on http://${host}:${port}`
        );

        if (this.options.onListening) {
          this.options.onListening({
            host,
            port,
            server: srv,
            app: this.app,
          });
        }

        resolve(srv);
      });

      this.server = srv;

      srv.on('error', (err) => {
        this.logger.error({ err }, 'Server error');
        reject(err);
      });

      if (this.options.autoSignalShutdown) {
        setupGracefulShutdown(srv, {
          timeoutMs: this.options.timeoutMs ?? this.config.shutdownTimeoutMs,
          cleanupHooks: this.options.cleanupHooks,
          logger: this.logger,
        });
      }
    });
  }

  /**
   * Gracefully shuts down the Wnodex HTTP server.
   * Stops accepting new connections, executes any configured cleanup hooks and optional chores,
   * and closes idle keep-alive connections.
   *
   * @param [chores] - Optional async callback to execute during shutdown cleanup.
   * @returns Promise resolving when the server has stopped gracefully.
   */
  public async shutdown(chores?: CleanupHook): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not running.');
      return;
    }

    this.logger.info('Shutdown initiated...');

    const hooks: CleanupHook[] = [...(this.options.cleanupHooks ?? [])];
    if (chores) {
      hooks.unshift(async () => {
        try {
          await chores();
        } catch (error) {
          this.logger.error({ err: error }, 'Error during cleanup chores');
        }
      });
    }

    await closeServerGracefully(this.server, {
      cleanupHooks: hooks,
      logger: this.logger,
    });

    this.server = undefined;
    this.logger.info('Server stopped gracefully.');
  }
}
