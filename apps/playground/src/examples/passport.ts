import * as readline from 'node:readline';

import type { Application, Request, Response } from 'express';

import passport from 'passport';

import open from 'open';
import { Wnodex, WnodexConfigInput } from 'wnodex';

// --- Constants ---

const PORT = 4000;

/**
 * Default configuration for the playground server.
 */
const DEFAULT_CONFIG: WnodexConfigInput = {
  port: PORT,
};

/**
 * Pre-defined CORS options to be toggled on/off.
 */
const CORS_OPTIONS: WnodexConfigInput['cors'] = {
  origin: [`http://localhost:${PORT}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'X-Custom-Header',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

/**
 * Pre-defined helmet options to be used in the playground.
 */
const HELMET_OPTIONS = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
};

/**
 * Pre-defined compression options to be used in the playground.
 */
export const COMPRESSION_OPTIONS: WnodexConfigInput['compression'] = true;

/**
 * Pre-defined rate limit options to be used in the playground.
 */
export const RATE_LIMIT_OPTIONS: WnodexConfigInput['rateLimit'] = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
};

/**
 * Pre-defined cookie parser options with custom decode logic.
 */
const COOKIE_PARSER_OPTIONS: WnodexConfigInput['cookieParser'] = {
  secret: ['your-secret-key', 'another-secret'],
  options: {
    decode: (val: string) => {
      // Example: custom decode logic (reverse string, ES2022-compatible, no reverse/toReversed)
      let out = '';
      for (let i = val.length - 1; i >= 0; i--) out += val[i];
      return out;
    },
  },
};

/**
 * Pre-defined HPP (HTTP Parameter Pollution) options.
 */
const HPP_OPTIONS: WnodexConfigInput['hpp'] = ['allowedParam', 'anotherParam'];

/**
 * Pre-defined Session options.
 */
const SESSION_OPTIONS: WnodexConfigInput['session'] = {
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60_000, // 1 minute
    // secure and httpOnly will use schema defaults
  },
};

/**
 * Pre-defined Passport options.
 */
export const PASSPORT_OPTIONS: WnodexConfigInput['passport'] = passport;

/**
 * Manages the CLI playground lifecycle, state, and user interactions.
 */
export class PlaygroundCLI {
  /**
   * The current configuration state.
   * @type {WnodexConfigInput}
   */
  #config: WnodexConfigInput;

  /**
   * The active server instance or null if stopped.
   * @type {Wnodex | null}
   */
  #server: Wnodex | null = null;

  /**
   * The readline interface for CLI interaction.
   * @type {readline.Interface}
   */
  #rl: readline.Interface;

  /**
   * Initializes the Playground CLI with default configuration.
   * @example
   * ```ts
   * const cli = new PlaygroundCLI();
   * cli.start();
   * ```
   */
  constructor() {
    this.#config = { ...DEFAULT_CONFIG };
    this.#rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });
  }

  /**
   * Starts the CLI loop and listens for user input.
   * @returns {void}
   * @example
   * ```ts
   * cli.start();
   * ```
   */
  start(): void {
    console.log('\n--- WNODEX PLAYGROUND ---');
    console.log('Type "start" to run the wnodex server.');
    console.log('Type "help" to see available commands.\n');

    this.#rl.prompt();

    this.#rl.on('line', async (line) => {
      await this.#handleInput(line);
      this.#rl.prompt();
    });
  }

  /**
   * Processes a single line of user input.
   * @param {string} line The raw input string from the console.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleInput('start');
   * ```
   */
  async #handleInput(line: string): Promise<void> {
    // Split input by spaces to separate command from arguments
    const parts = line.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const arg = parts[1]; // e.g., the path for 'ping'

    try {
      switch (command) {
        case 'start': {
          await this.#handleStart();
          break;
        }
        case 'o':
        case 'open': {
          await this.#handleOpen();
          break;
        }
        case 'stop': {
          await this.#handleStop();
          break;
        }
        case 'restart': {
          await this.#handleRestart();
          break;
        }
        case 'reset': {
          await this.#handleReset();
          break;
        }
        case 'enable:cors': {
          await this.#handleCors(true);
          break;
        }
        case 'disable:cors': {
          await this.#handleCors(false);
          break;
        }
        case 'enable:helmet': {
          await this.#handleHelmet(true);
          break;
        }
        case 'disable:helmet': {
          await this.#handleHelmet(false);
          break;
        }
        case 'enable:compression': {
          await this.#handleCompression(true);
          break;
        }
        case 'disable:compression': {
          await this.#handleCompression(false);
          break;
        }
        case 'enable:rate-limit': {
          await this.#handleRateLimit(true);
          break;
        }
        case 'disable:rate-limit': {
          await this.#handleRateLimit(false);
          break;
        }
        case 'enable:cookie-parser': {
          await this.#handleCookieParser(true);
          break;
        }
        case 'disable:cookie-parser': {
          await this.#handleCookieParser(false);
          break;
        }
        case 'enable:hpp': {
          await this.#handleHpp(true);
          break;
        }
        case 'disable:hpp': {
          await this.#handleHpp(false);
          break;
        }
        case 'enable:session': {
          await this.#handleSession(true);
          break;
        }
        case 'disable:session': {
          await this.#handleSession(false);
          break;
        }
        case 'enable:passport': {
          await this.#handlePassport(true);
          break;
        }
        case 'disable:passport': {
          await this.#handlePassport(false);
          break;
        }
        case 'ping': {
          await this.#handlePing(arg);
          break;
        }
        case 'help': {
          this.#showHelp();
          break;
        }
        case 'q':
        case 'exit': {
          await this.#handleExit();
          break;
        }
        default: {
          if (command) {
            console.log(
              `Unknown command: "${command}". Type "help" for options.`
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error('An error occurred during command execution:', error);
    }
  }

  /**
   * Starts a new server instance using the current configuration state.
   * If a server is already running, it will not start a new one.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleStart();
   * ```
   */
  async #handleStart(): Promise<void> {
    // Ensure strictly one instance is running
    if (this.#server) {
      console.log('Server is already running. Use "restart" or "stop".');
      return;
    }

    console.log('Initializing Wnodex...');

    try {
      // 1. Create new instance and assign directly to private field
      this.#server = new Wnodex(this.#config);

      // 2. Re-attach routes (Using internal method)
      this.#setupRoutes(this.#server.getApp());

      // 3. Start listening
      await this.#server.start();

      // Log current status
      const logger = this.#server.getLogger();
      const corsStatus = this.#config.cors ? 'ON' : 'OFF';
      const helmetStatus = this.#config.helmet ? 'ON' : 'OFF';
      const compressionStatus = this.#config.compression ? 'ON' : 'OFF';
      const rateLimitStatus = this.#config.rateLimit ? 'ON' : 'OFF';
      const cookieParserStatus = this.#config.cookieParser ? 'ON' : 'OFF';
      const hppStatus = this.#config.hpp ? 'ON' : 'OFF';
      const sessionStatus = this.#config.session ? 'ON' : 'OFF';
      const passportStatus = this.#config.passport ? 'ON' : 'OFF';

      logger.info(
        `Playground Ready. [CORS: ${corsStatus}] [HELMET: ${helmetStatus}] [COMPRESSION: ${compressionStatus}] [RATE-LIMIT: ${rateLimitStatus}] [COOKIE: ${cookieParserStatus}] [HPP: ${hppStatus}] [SESSION: ${sessionStatus}] [PASSPORT: ${passportStatus}]`
      );
    } catch (error) {
      console.error('Failed to start server:', error);
      this.#server = null; // Reset state on failure
    }
  }

  /**
   * Stops the currently running server, if any. If no server is running, logs a message.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleStop();
   * ```
   */
  async #handleStop(): Promise<void> {
    if (this.#server) {
      console.log('Stopping current server...');
      await this.#server.shutdown();
      this.#server = null;
      console.log('Server stopped.');
    } else {
      console.log('No server running to stop.');
    }
  }

  /**
   * Restarts the server with the current configuration. Stops the server if running, then starts it again.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleRestart();
   * ```
   */
  async #handleRestart(): Promise<void> {
    console.log('Restarting server...');
    await this.#handleStop();
    await this.#handleStart();
  }

  /**
   * Opens the default browser at the server's URL if the server is running. Otherwise, logs a message.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleOpen();
   * ```
   */
  async #handleOpen(): Promise<void> {
    if (this.#server) {
      const { port } = this.#config;
      const url = `http://localhost:${port}`;
      console.log(`Opening browser at ${url}...`);
      await open(url);
    } else {
      console.log('Server is not running. Type "start" first.');
    }
  }

  /**
   * Resets the configuration to defaults and restarts the server to apply changes.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleReset();
   * ```
   */
  async #handleReset(): Promise<void> {
    console.log('Resetting configuration to defaults...');
    this.#config = { ...DEFAULT_CONFIG };
    await this.#handleRestart();
  }

  /**
   * Enables or disables CORS in the configuration and restarts the server to apply the change.
   * @param {boolean} enable Whether to enable or disable CORS.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleCors(true);
   * ```
   */
  async #handleCors(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling CORS...');
      this.#config.cors = CORS_OPTIONS;
    } else {
      console.log('Disabling CORS...');
      this.#config.cors = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Helmet in the configuration and restarts the server to apply the change.
   * @param {boolean} enable Whether to enable or disable Helmet.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleHelmet(true);
   * ```
   */
  async #handleHelmet(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Helmet...');
      this.#config.helmet = HELMET_OPTIONS;
    } else {
      console.log('Disabling Helmet...');
      this.#config.helmet = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Compression in the configuration and restarts the server to apply the change.
   * @param {boolean} enable Whether to enable or disable Compression.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleCompression(true);
   * ```
   */
  async #handleCompression(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Compression...');
      this.#config.compression = COMPRESSION_OPTIONS;
    } else {
      console.log('Disabling Compression...');
      this.#config.compression = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Rate Limiting in the configuration and restarts the server to apply the change.
   * @param {boolean} enable Whether to enable or disable Rate Limiting.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleRateLimit(true);
   * ```
   */
  async #handleRateLimit(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Rate Limit...');
      this.#config.rateLimit = RATE_LIMIT_OPTIONS;
    } else {
      console.log('Disabling Rate Limit...');
      this.#config.rateLimit = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Cookie Parser in the configuration and restarts the server to apply the change.
   * @param {boolean} enable Whether to enable or disable Cookie Parser.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleCookieParser(true);
   * ```
   */
  async #handleCookieParser(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Cookie Parser...');
      this.#config.cookieParser = COOKIE_PARSER_OPTIONS;
    } else {
      console.log('Disabling Cookie Parser...');
      this.#config.cookieParser = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables HPP (HTTP Parameter Pollution) protection and restarts the server.
   * @param {boolean} enable Whether to enable or disable HPP.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleHpp(true);
   * ```
   */
  async #handleHpp(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling HPP Protection...');
      this.#config.hpp = HPP_OPTIONS;
    } else {
      console.log('Disabling HPP Protection...');
      this.#config.hpp = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Session management in the configuration and restarts the server.
   * @param {boolean} enable Whether to enable or disable Session.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleSession(true);
   * ```
   */
  async #handleSession(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Session...');
      this.#config.session = SESSION_OPTIONS;
    } else {
      console.log('Disabling Session...');
      this.#config.session = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Enables or disables Passport integration in the configuration and restarts the server.
   * @param {boolean} enable Whether to enable or disable Passport.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handlePassport(true);
   * ```
   */
  async #handlePassport(enable: boolean): Promise<void> {
    if (enable) {
      console.log('Enabling Passport...');
      this.#config.passport = PASSPORT_OPTIONS;
    } else {
      console.log('Disabling Passport...');
      this.#config.passport = undefined;
    }
    await this.#handleRestart();
  }

  /**
   * Performs a GET request to the local server to verify connectivity and response.
   * @param {string} [path] The URL path to ping (defaults to root '/').
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handlePing('/about');
   * ```
   */
  async #handlePing(path: string = '/'): Promise<void> {
    if (!this.#server) {
      console.log('Server is not running. Type "start" first.');
      return;
    }

    // Normalize path to ensure it starts with '/'
    const safePath = path.startsWith('/') ? path : `/${path}`;
    const url = `http://localhost:${this.#config.port}${safePath}`;

    console.log(`> GET ${url}`);

    try {
      const response = await fetch(url);
      const text = await response.text();
      const contentType = response.headers.get('content-type');

      console.log(`< Status: ${response.status} ${response.statusText}`);

      // Pretty print if JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          console.log(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          console.log(text);
        }
      } else {
        console.log(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`! Request failed: ${message}`);
    }
  }

  /**
   * Applies the merged playground application route to the Express app.
   * Mounts a single endpoint at the root path ('/') that provides both health status and configuration info.
   * @param {Application} app The Express application instance.
   * @returns {void}
   * @example
   * ```ts
   * cli.#setupRoutes(app);
   * // GET / returns { status: "...", activeConfig: { ... }, ... }
   * ```
   */
  #setupRoutes(app: Application): void {
    app.get('/', (_req: Request, res: Response) => {
      res.json({
        status: 'OK - Playground Active',
        activeConfig: this.#config,
      });
    });
  }

  /**
   * Displays the help menu with available CLI commands and their descriptions.
   * @returns {void}
   * @example
   * ```ts
   * cli.#showHelp();
   * ```
   */
  #showHelp(): void {
    console.log(`
Commands:
  start                  - Start the server with current config
  stop                   - Stop the server
  restart                - Restart the server
  reset                  - Reset config to default and restart
  enable:cors            - Enable CORS options and restart
  disable:cors           - Disable CORS options and restart
  enable:helmet          - Enable Helmet options and restart
  disable:helmet         - Disable Helmet options and restart
  enable:compression     - Enable Compression and restart
  disable:compression    - Disable Compression and restart
  enable:rate-limit      - Enable Rate Limit and restart
  disable:rate-limit     - Disable Rate Limit and restart
  enable:cookie-parser   - Enable Cookie Parser and restart
  disable:cookie-parser  - Disable Cookie Parser and restart
  enable:hpp             - Enable HPP protection and restart
  disable:hpp            - Disable HPP protection and restart
  enable:session         - Enable Session management and restart
  disable:session        - Disable Session management and restart
  enable:passport        - Enable Passport integration and restart
  disable:passport       - Disable Passport integration and restart
  ping [path]            - Ping the server (e.g., "ping" or "ping /about")
  open / o               - Open browser at server URL
  exit / q               - Quit playground
        `);
  }

  /**
   * Stops the server if running, closes the readline interface, and exits the process.
   * @returns {Promise<void>}
   * @example
   * ```ts
   * await cli.#handleExit();
   * ```
   */
  async #handleExit(): Promise<void> {
    await this.#handleStop();
    console.log('Bye!');
    this.#rl.close();
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }
}
