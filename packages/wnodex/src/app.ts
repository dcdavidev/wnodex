/**
 * @file Express application factory and middleware configuration.
 * @module app
 */

import type {
  ErrorRequestHandler,
  Express,
  RequestHandler,
  Router,
} from 'express';
import express from 'express';

import type { Logger } from 'pino';

import { config as defaultConfig, type ServerConfig } from './config/env.js';
import { DEFAULT_HEALTH_PATH } from './constants/index.js';
import { createHealthRouter, type HealthCheckOptions } from './health/index.js';
import { logger as defaultLogger } from './logger/logger.js';
import {
  type BodyParserOptions,
  createBodyParserMiddlewares,
} from './middlewares/body-parser.js';
import {
  type CompressionOptions,
  createCompressionMiddleware,
} from './middlewares/compression.js';
import {
  type CookieParseOptions,
  type CookieParserOptions,
  createCookieParserMiddleware,
} from './middlewares/cookie-parser.js';
import { type CorsOptions, createCorsMiddleware } from './middlewares/cors.js';
import {
  createErrorHandler,
  notFoundHandler as defaultNotFoundHandler,
} from './middlewares/error-handler.js';
import {
  createHelmetMiddleware,
  type HelmetOptions,
} from './middlewares/helmet.js';
import { createHppMiddleware, type HppOptions } from './middlewares/hpp.js';
import {
  configurePassport,
  type PassportMiddlewareOptions,
  type PassportStatic,
} from './middlewares/passport.js';
import {
  createRateLimiter,
  type RateLimitOptions,
} from './middlewares/rate-limiter.js';
import {
  createSessionMiddleware,
  type SessionMiddlewareOptions,
} from './middlewares/session.js';
import {
  registerStaticAssets,
  type StaticAssetsOptions,
} from './middlewares/static.js';

/**
 * Options to customize the Express application creation.
 */
export interface CreateAppOptions {
  /**
  Optional server configuration instance
  */
  config?: ServerConfig;
  /**
  Service name identifier
  */
  serviceName?: string;
  /**
  Custom logger instance
  */
  logger?: Logger;
  /**
   * Custom application settings to inject via `app.set(name, value)`.
   * Settings can be retrieved later using `app.get(name)`.
   */
  settings?: Record<string, unknown>;
  /**
  Trust proxy configuration (e.g. 1 for single proxy, true, or IP list; default: 1)
  */
  trustProxy?: boolean | number | string;
  /**
  Whether to disable the 'x-powered-by' header (default: true)
  */
  disableXPoweredBy?: boolean;
  /**
  Whether to enable Helmet security headers middleware (default: true)
  */
  enableHelmet?: boolean;
  /**
  Custom options for Helmet middleware
  */
  helmetOptions?: HelmetOptions;
  /**
  Whether to enable Cross-Origin Resource Sharing (default: true)
  */
  enableCors?: boolean;
  /**
  Custom options for CORS middleware
  */
  corsOptions?: CorsOptions;
  /**
  Whether to enable response compression middleware (default: false, or true if compressionOptions provided)
  */
  enableCompression?: boolean;
  /**
  Custom options for response compression middleware
  */
  compressionOptions?: CompressionOptions;
  /**
  Whether to enable JSON and URL-encoded body parsers (default: true)
  */
  enableBodyParser?: boolean;
  /**
  Payload limit for body parsers (e.g. '1mb', '5mb')
  */
  bodyLimit?: string;
  /**
  Granular options for JSON and URL-encoded body parsers
  */
  bodyParserOptions?: BodyParserOptions;
  /**
  Whether to enable cookie-parser middleware (default: false, or true if cookieParserOptions provided)
  */
  enableCookieParser?: boolean;
  /**
  Custom options or secret(s) for cookie-parser middleware
  */
  cookieParserOptions?:
    CookieParserOptions | CookieParseOptions | string | string[];
  /**
  Whether to enable HTTP Parameter Pollution protection (default: true)
  */
  enableHpp?: boolean;
  /**
  Custom options for HPP middleware or array of whitelisted parameters
  */
  hppOptions?: HppOptions | string[];
  /**
  Whether to enable IP rate limiting (default: true)
  */
  enableRateLimit?: boolean;
  /**
  Custom options for rate limiter
  */
  rateLimitOptions?: Partial<RateLimitOptions>;
  /**
  Whether to enable express-session middleware (default: false, or true if sessionOptions provided)
  */
  enableSession?: boolean;
  /**
  Custom options for express-session middleware
  */
  sessionOptions?: SessionMiddlewareOptions;
  /**
  Whether to enable Passport authentication middleware (default: false, or true if passportOptions provided)
  */
  enablePassport?: boolean;
  /**
  Custom options or instance for Passport middleware
  */
  passportOptions?: PassportMiddlewareOptions | PassportStatic;
  /**
  Whether to automatically mount health check endpoints (`/health`, `/health/live`, `/health/ready`; default: true)
  */
  enableHealthCheck?: boolean;
  /**
  Configuration options to extend or customize health check endpoints and plugins
  */
  healthOptions?: HealthCheckOptions;
  /**
  Optional static assets configuration or client root directory
  */
  staticOptions?: string | StaticAssetsOptions;
  /**
  Application routes or Router to mount
  */
  routes?: Router | RequestHandler | ((app: Express) => void);
  /**
  Callback allowing additional custom middleware or route registration
  */
  configure?: (app: Express) => void;
  /**
  Custom 404 Not Found fallback handler
  */
  notFoundHandler?: RequestHandler;
  /**
  Custom centralized error handling middleware
  */
  errorHandler?: ErrorRequestHandler;
}

/**
 * Creates and configures a new Express application instance with security,
 * compression, body/cookie parsing, rate limiting, session, passport, health checks, and error handling.
 *
 * @param [options] - Configuration options for the Express application.
 * @returns Fully configured Express application instance.
 */
export function createApp(options?: CreateAppOptions): Express {
  const app: Express = express();
  const activeConfig = options?.config ?? defaultConfig;
  const activeLogger = options?.logger ?? defaultLogger;

  // Store resolved logger and nodeEnv on the Express application
  app.set('logger', activeLogger);
  app.set('nodeEnv', activeConfig.nodeEnv);

  // Set serviceName setting if provided via options or config
  const resolvedServiceName = options?.serviceName ?? activeConfig.serviceName;
  if (resolvedServiceName !== undefined) {
    app.set('serviceName', resolvedServiceName);
  }

  // Custom application settings via app.set(name, value)
  if (options?.settings) {
    for (const [key, value] of Object.entries(options.settings)) {
      app.set(key, value);
    }
  }

  // Configure reverse proxy trust
  if (options?.trustProxy === undefined) {
    if (app.get('trust proxy') === undefined) {
      app.set('trust proxy', 1);
    }
  } else {
    app.set('trust proxy', options.trustProxy);
  }

  // Disable x-powered-by header
  if (options?.disableXPoweredBy !== false) {
    app.disable('x-powered-by');
  }

  // 1. Security headers with Helmet
  if (options?.enableHelmet !== false) {
    app.use(createHelmetMiddleware(options?.helmetOptions));
  }

  // 2. CORS configuration (propagates activeConfig.corsOrigin unless overridden in corsOptions)
  if (options?.enableCors !== false) {
    app.use(
      createCorsMiddleware({
        origin: activeConfig.corsOrigin,
        ...options?.corsOptions,
      })
    );
  }

  // 3. Response compression
  const shouldEnableCompression =
    options?.enableCompression ?? options?.compressionOptions !== undefined;
  if (shouldEnableCompression) {
    app.use(createCompressionMiddleware(options?.compressionOptions));
  }

  // 4. Request body parsing (propagates options.bodyParserOptions, options.bodyLimit, or activeConfig.bodyLimit)
  if (options?.enableBodyParser !== false) {
    const resolvedBodyLimit = options?.bodyLimit ?? activeConfig.bodyLimit;
    const bodyParserInput: BodyParserOptions = {
      limit: resolvedBodyLimit,
      ...options?.bodyParserOptions,
    };
    for (const middleware of createBodyParserMiddlewares(bodyParserInput)) {
      app.use(middleware);
    }
  }

  // 5. Cookie parsing
  const shouldEnableCookieParser =
    options?.enableCookieParser ?? options?.cookieParserOptions !== undefined;
  if (shouldEnableCookieParser) {
    const cookieOpts =
      options?.cookieParserOptions ??
      (activeConfig.cookieSecret
        ? { secret: activeConfig.cookieSecret }
        : undefined);
    app.use(createCookieParserMiddleware(cookieOpts));
  }

  // 6. HTTP Parameter Pollution protection
  if (options?.enableHpp !== false) {
    app.use(createHppMiddleware(options?.hppOptions));
  }

  // 7. Rate limiting (propagates activeConfig thresholds unless overridden in rateLimitOptions)
  if (options?.enableRateLimit !== false) {
    app.use(
      createRateLimiter({
        windowMs: activeConfig.rateLimitWindowMs,
        limit: activeConfig.rateLimitMax,
        ...options?.rateLimitOptions,
      })
    );
  }

  // 8. Session management
  const shouldEnableSession =
    options?.enableSession ?? options?.sessionOptions !== undefined;
  if (shouldEnableSession) {
    app.use(
      createSessionMiddleware({
        secret: activeConfig.sessionSecret,
        isProduction: activeConfig.isProduction,
        ...options?.sessionOptions,
      })
    );
  }

  // 9. Passport authentication
  const shouldEnablePassport =
    options?.enablePassport ?? options?.passportOptions !== undefined;
  if (shouldEnablePassport) {
    configurePassport(app, options?.passportOptions ?? true);
  }

  // 10. Health check endpoints
  if (options?.enableHealthCheck !== false) {
    const healthPath = options?.healthOptions?.path ?? DEFAULT_HEALTH_PATH;
    const healthRouter = createHealthRouter(options?.healthOptions);
    app.use(healthPath, healthRouter);
  }

  // 11. Static assets serving
  if (options?.staticOptions !== undefined) {
    registerStaticAssets(app, options.staticOptions);
  }

  // 12. Custom routes mounting
  if (typeof options?.routes === 'function') {
    if (options.routes.length === 1) {
      (options.routes as (app: Express) => void)(app);
    } else {
      app.use(options.routes as RequestHandler);
    }
  } else if (options?.routes) {
    app.use(options.routes);
  }

  // 13. Custom setup callback
  if (options?.configure) {
    options.configure(app);
  }

  // Dynamic router mounted prior to 404 and error handlers so routes registered
  // on `app` after `createApp()` / `new Wnodex()` still execute before fallbacks
  const dynamicRouter: Router = express.Router();
  app.use(dynamicRouter);

  // 14. 404 Not Found fallback handler
  app.use(
    options?.notFoundHandler === undefined
      ? defaultNotFoundHandler
      : options.notFoundHandler
  );

  // 15. Centralized error handling (propagates activeConfig environment flags)
  if (options?.errorHandler === undefined) {
    app.use(
      createErrorHandler({
        logger: activeLogger,
        isDevelopment: activeConfig.isDevelopment,
        isProduction: activeConfig.isProduction,
      })
    );
  } else {
    app.use(options.errorHandler);
  }

  // Bind post-initialization routing methods to `dynamicRouter` while preserving
  // single-argument `app.get(settingName)` lookups
  const originalGet = app.get.bind(app);
  app.get = ((...args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === 'string') {
      return originalGet(args[0]);
    }
    (dynamicRouter.get as (...a: unknown[]) => unknown)(...args);
    return app;
  }) as Express['get'];

  const delegatedMethods = [
    'post',
    'put',
    'patch',
    'delete',
    'options',
    'head',
    'all',
    'use',
  ] as const;

  for (const method of delegatedMethods) {
    app[method] = ((...args: unknown[]) => {
      (dynamicRouter[method] as (...a: unknown[]) => unknown)(...args);
      return app;
    }) as Express[typeof method];
  }

  app.route = dynamicRouter.route.bind(dynamicRouter);
  app.param = ((...args: unknown[]) => {
    (dynamicRouter.param as (...a: unknown[]) => unknown)(...args);
    return app;
  }) as Express['param'];

  return app;
}
