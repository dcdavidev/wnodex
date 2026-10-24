/**
 * @file Server initialization and lifecycle helpers.
 * @module server
 */

import type { Server } from 'node:http';
import process from 'node:process';

import type { Express } from 'express';

import type { Logger } from 'pino';

import { createApp, type CreateAppOptions } from './app.js';
import { config as defaultConfig, type ServerConfig } from './config/env.js';
import { DEFAULT_SERVICE_NAME } from './constants/index.js';
import { logger as defaultLogger } from './logger/logger.js';
import { type CleanupHook, setupGracefulShutdown } from './server/shutdown.js';

/**
 * Options for starting an HTTP server instance.
 */
export interface StartServerOptions {
  /**
  Optional server configuration instance
  */
  config?: ServerConfig;
  /**
  Custom logger instance
  */
  logger?: Logger;
  /**
  Service name used in log output
  */
  serviceName?: string;
  /**
  Maximum grace period in milliseconds before forced process termination
  */
  timeoutMs?: number;
  /**
  Array of asynchronous cleanup hooks to execute on shutdown
  */
  cleanupHooks?: CleanupHook[];
  /**
  Callback invoked once the server starts listening
  */
  onListening?: (info: {
    host: string;
    port: number;
    server: Server;
    app: Express;
  }) => void;
}

/**
 * Combined options for creating and starting a server simultaneously.
 */
export interface CreateServerOptions
  extends CreateAppOptions, StartServerOptions {}

/**
 * Combined server result object returned by createServer.
 */
export interface ServerInstance {
  /**
  Configured Express application
  */
  app: Express;
  /**
  Running Node.js HTTP server
  */
  server: Server;
  /**
  Active Logger instance
  */
  logger: Logger;
  /**
  Resolved Server configuration
  */
  config: ServerConfig;
}

/**
 * Starts an HTTP server for an Express application and binds graceful termination handlers.
 *
 * @param [appOrOptions] - Express application or start options.
 * @param [maybeOptions] - Start options if the first argument is an Express application.
 * @returns The running Node.js HTTP server instance.
 */
export function startServer(
  appOrOptions?: Express | (StartServerOptions & CreateAppOptions),
  maybeOptions?: StartServerOptions
): Server {
  let app: Express;
  let options: StartServerOptions & CreateAppOptions;

  if (
    appOrOptions &&
    typeof (appOrOptions as unknown as Express).listen === 'function'
  ) {
    app = appOrOptions as Express;
    options = maybeOptions ?? {};
  } else {
    options = (appOrOptions as StartServerOptions & CreateAppOptions) ?? {};
    app = createApp(options);
  }

  const activeConfig = options.config ?? defaultConfig;
  const activeLogger =
    options.logger ??
    (app.get('logger') as Logger | undefined) ??
    defaultLogger;
  const serviceName =
    options.serviceName ??
    (typeof app.get('serviceName') === 'string'
      ? (app.get('serviceName') as string)
      : undefined) ??
    activeConfig.serviceName ??
    DEFAULT_SERVICE_NAME;

  const host = activeConfig.host;
  const port = activeConfig.port;

  const server: Server = app.listen(port, host, () => {
    activeLogger.info(
      {
        host,
        port,
        nodeEnv: activeConfig.nodeEnv,
        pid: process.pid,
      },
      `🚀 ${serviceName} started on http://${host}:${port}`
    );

    if (options.onListening) {
      options.onListening({
        host,
        port,
        server,
        app,
      });
    }
  });

  setupGracefulShutdown(server, {
    timeoutMs: options.timeoutMs ?? activeConfig.shutdownTimeoutMs,
    cleanupHooks: options.cleanupHooks,
    logger: activeLogger,
  });

  return server;
}

/**
 * Creates and starts a fully configured Express server in a single call.
 *
 * @param [options] - Combined options to configure the Express app and start the server.
 * @returns An object containing the app, running server, logger, and config.
 */
export function createServer(options?: CreateServerOptions): ServerInstance {
  const activeConfig = options?.config ?? defaultConfig;
  const activeLogger = options?.logger ?? defaultLogger;

  const app = createApp({
    config: activeConfig,
    logger: activeLogger,
    ...options,
  });

  const server = startServer(app, {
    config: activeConfig,
    logger: activeLogger,
    ...options,
  });

  return {
    app,
    server,
    logger: activeLogger,
    config: activeConfig,
  };
}
