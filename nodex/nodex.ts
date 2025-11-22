import type { Server } from 'node:http';

import express, { type Application } from 'express';

import type { Logger } from 'pino';

import { setupConfig } from './helpers/setup-config.js';
import { setupMiddlewares } from './helpers/setup-middlewares.js';
import { logger } from './logger.js';
import {
  type NodexConfigInput,
  type NodexConfigOutput,
} from './schemas/nodex-config.js';

/**
 * Main application class for the Nodex server.
 *
 * Handles Express app instantiation, configuration validation,
 * middleware setup, logging, error handling, server startup, and graceful shutdown.
 */
export class Nodex {
  public app: Application;
  private server?: Server;
  private readonly config: NodexConfigOutput;
  private readonly logger: Logger;

  /**
   * Constructs a new Nodex server instance.
   * Initializes the Express app, logger, validates and stores configuration, and applies middlewares.
   * @param config Configuration input for Nodex, validated by NodexConfigSchema.
   * @example
   * const nodex = new Nodex({ port: 3000 });
   */
  constructor(config: NodexConfigInput) {
    this.app = express();

    // Logger
    this.logger = logger;
    this.app.set('logger', logger);

    // Config
    this.config = setupConfig(config);

    // Global Middlewares
    setupMiddlewares(this.app, this.config);
  }

  /**
   * Provides access to the application's logger instance.
   * @returns Logger instance.
   * @example
   * const log = nodex.getLogger();
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Returns the validated Nodex configuration.
   * @returns NodexConfigOutput object.
   * @example
   * const config = nodex.getConfig();
   */
  public getConfig(): NodexConfigOutput {
    return this.config;
  }

  /**
   * Public getter for the express app instance.
   * @returns The express application instance.
   * @example
   * const app = Nodex.getApp();
   */
  public getApp(): Application {
    return this.app;
  }

  // --- Nodex Start Helper ---

  /**
   * Starts the Nodex server and listens on the specified port.
   * Resolves when the server is ready.
   * @returns Promise that resolves once server is running.
   * @example
   * await nodex.start();
   */
  public start(): Promise<void> {
    const logger = this.getLogger();
    const { port } = this.getConfig();

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`Server running @ http://localhost:${port}`);
        resolve();
      });

      // Attach error handler immediately after server creation
      this.server?.on('error', (err) => {
        logger.error(err, 'Server error:');
      });
    });
  }

  // --- Nodex Graceful Shutdown ---

  /**
   * Gracefully shuts down the Nodex server.
   * Stops accepting new connections, allows active connections to finish,
   * runs optional asynchronous cleanup chores, and closes the server.
   * @param chores An optional async callback function to perform cleanup tasks
   * before shutdown (e.g., closing DB connections, clearing cache). This function is awaited before closing the server.
   *
   * @returns Promise that resolves when the server has stopped gracefully.
   *
   * @example
   * await nodex.shutdown(async () => {
   *   await db.close();
   *   await cache.clear();
   * });
   */
  public async shutdown(chores?: () => Promise<void> | void): Promise<void> {
    const logger = this.getLogger();

    if (!this.server) {
      logger.warn('Server not running.');
      return;
    }

    logger.info('Shutdown initiated...');

    if (chores) {
      try {
        await chores();
      } catch (error) {
        logger.error(error, 'Error during cleanup chores');
        // Proceed with shutdown even if chores fail
      }
    }

    return new Promise((resolve, reject) => {
      this.server!.close((err) => {
        if (err) {
          logger.error(err, 'Error during server shutdown');
          reject(err);
          return;
        }
        logger.info('Server stopped gracefully.');
        resolve();
      });
    });
  }
}
