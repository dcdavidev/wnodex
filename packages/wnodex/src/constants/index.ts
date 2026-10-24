/**
 * @file Centralized default constants and shared configuration values.
 * @module constants
 */

/**
Default runtime environment when NODE_ENV is not specified.
*/
export const DEFAULT_NODE_ENV = 'development';

/**
Default network port the HTTP server listens on.
*/
export const DEFAULT_PORT = 3000;

/**
Default network host address the HTTP server binds to.
*/
export const DEFAULT_HOST = 'localhost';

/**
Default service name used in logs and health reports when not explicitly configured.
*/
export const DEFAULT_SERVICE_NAME = 'Express server';

/**
Default graceful shutdown timeout in milliseconds (10 seconds).
*/
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/**
Default request body size limit for JSON and URL-encoded parsers.
*/
export const DEFAULT_BODY_LIMIT = '1mb';

/**
Default allowed CORS origin.
*/
export const DEFAULT_CORS_ORIGIN = '*';

/**
Default allowed HTTP methods for CORS requests.
*/
export const DEFAULT_CORS_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const;

/**
Default allowed HTTP headers for CORS requests.
*/
export const DEFAULT_CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'X-Request-Id',
] as const;

/**
Default rate limiting window duration in milliseconds (15 minutes).
*/
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
Default maximum number of requests per IP within the rate limit window.
*/
export const DEFAULT_RATE_LIMIT_MAX = 100;

/**
Default session cookie maxAge in milliseconds (24 hours).
*/
export const DEFAULT_SESSION_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
Default session cookie httpOnly flag.
*/
export const IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY = true;

/**
Default express-session resave option.
*/
export const SHOULD_DEFAULT_SESSION_RESAVE = false;

/**
Default express-session saveUninitialized option.
*/
export const SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED = false;

/**
Default Cache-Control maxAge for root static files.
*/
export const DEFAULT_STATIC_MAX_AGE = '1h';

/**
Default Cache-Control maxAge for immutable `/static` assets.
*/
export const DEFAULT_IMMUTABLE_STATIC_MAX_AGE = '1y';

/**
Default mount path for health check endpoints.
*/
export const DEFAULT_HEALTH_PATH = '/health';

/**
Critical heap usage ratio threshold (98%) for readiness probes.
*/
export const CRITICAL_HEAP_USAGE_RATIO = 0.98;

/**
Supported Pino log level constants.
*/
export const LOG_LEVELS = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
  SILENT: 'silent',
} as const;

/**
Union type of supported Pino log levels.
*/
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
Default sensitive object paths redacted automatically by the Pino logger.
*/
export const DEFAULT_REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'token',
] as const;
