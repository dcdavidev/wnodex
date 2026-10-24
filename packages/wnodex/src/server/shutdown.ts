/**
 * @file Graceful shutdown coordinator for the HTTP server and runtime resources.
 * @module server/shutdown
 */

/* eslint-disable unicorn/no-process-exit */

import type { Server } from 'node:http';
import process from 'node:process';

import type { Logger } from 'pino';

import { config } from '../config/env.js';
import { logger as defaultLogger } from '../logger/logger.js';

/**
 * Cleanup function signature for resources that must be released before termination.
 */
export type CleanupHook = () => Promise<void> | void;

/**
 * Configuration options for graceful shutdown handling.
 */
export interface ShutdownOptions {
  /**
  Maximum grace period in milliseconds before forcing process termination
  */
  timeoutMs?: number;
  /**
  Optional array of asynchronous cleanup hooks (e.g., database disconnections)
  */
  cleanupHooks?: CleanupHook[];
  /**
  Custom logger instance
  */
  logger?: Logger;
}

/**
 * Programmatically drains and closes an HTTP server and executes registered cleanup hooks
 * without terminating the Node.js process.
 *
 * @param server - The running Node.js HTTP server instance.
 * @param [options] - Optional shutdown options.
 * @returns Promise resolving when the server is closed and hooks have completed.
 */
export async function closeServerGracefully(
  server: Server,
  options: ShutdownOptions = {}
): Promise<void> {
  const activeLogger = options.logger ?? defaultLogger;
  const cleanupHooks = options.cleanupHooks ?? [];

  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    activeLogger.info(
      'HTTP server successfully stopped accepting connections.'
    );
  }

  for (const hook of cleanupHooks) {
    await hook();
  }
}

/**
 * Registers signal handlers (SIGTERM, SIGINT) and process error listeners
 * (uncaughtException, unhandledRejection) to ensure the server gracefully
 * drains connections and releases resources before terminating.
 *
 * @param server - The running Node.js HTTP server instance.
 * @param [options] - Optional custom options for the shutdown sequence.
 */
export function setupGracefulShutdown(
  server: Server,
  options: ShutdownOptions = {}
): void {
  const activeLogger = options.logger ?? defaultLogger;
  const timeoutMs = options.timeoutMs ?? config.shutdownTimeoutMs;
  const cleanupHooks = options.cleanupHooks ?? [];

  let isShuttingDown = false;

  /**
   * Orchestrates the graceful shutdown procedure.
   *
   * @param trigger - The signal or event that initiated the shutdown.
   * @param exitCode - The process exit code (0 for normal, 1 for abnormal).
   */
  async function handleShutdown(
    trigger: string,
    exitCode: number
  ): Promise<void> {
    if (isShuttingDown) {
      activeLogger.warn(
        `Shutdown already in progress. Ignoring duplicate trigger: ${trigger}`
      );
      return;
    }

    isShuttingDown = true;
    activeLogger.info(`Received ${trigger}. Starting graceful shutdown...`);

    // Safety timeout: force exit if graceful cleanup exceeds timeoutMs
    const forceExitTimer = setTimeout(() => {
      activeLogger.error(
        `Graceful shutdown timed out after ${timeoutMs}ms. Forcing process exit.`
      );
      process.exit(1);
    }, timeoutMs);

    // Prevent the force exit timer from keeping the event loop alive if everything closes cleanly
    forceExitTimer.unref();

    try {
      await closeServerGracefully(server, {
        cleanupHooks,
        logger: activeLogger,
      });

      activeLogger.info(
        'All cleanup tasks completed successfully. Exiting process.'
      );
      clearTimeout(forceExitTimer);
      process.exit(exitCode);
    } catch (error) {
      activeLogger.error(
        { error },
        'Error occurred during graceful shutdown sequence.'
      );
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  const onSigterm = (): void => {
    void handleShutdown('SIGTERM', 0);
  };
  const onSigint = (): void => {
    void handleShutdown('SIGINT', 0);
  };
  const onUncaughtException = (error: Error): void => {
    activeLogger.fatal({ err: error }, `Uncaught exception: ${error.message}`);
    void handleShutdown('uncaughtException', 1);
  };
  const onUnhandledRejection = (reason: unknown): void => {
    activeLogger.fatal({ reason }, 'Unhandled promise rejection detected.');
    void handleShutdown('unhandledRejection', 1);
  };

  process.on('SIGTERM', onSigterm);
  process.on('SIGINT', onSigint);
  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  // Automatically detach process listeners if the server is closed programmatically
  server.once('close', () => {
    process.off('SIGTERM', onSigterm);
    process.off('SIGINT', onSigint);
    process.off('uncaughtException', onUncaughtException);
    process.off('unhandledRejection', onUnhandledRejection);
  });
}
