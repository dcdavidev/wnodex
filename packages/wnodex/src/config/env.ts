/**
 * @file Application environment configuration.
 * @module config/env
 */

import process from 'node:process';

import {
  DEFAULT_BODY_LIMIT,
  DEFAULT_CORS_ORIGIN,
  DEFAULT_HOST,
  DEFAULT_NODE_ENV,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  LOG_LEVELS,
} from '../constants/index.js';
import { parseEnvInt, parseEnvOriginList, parseEnvString } from './parsers.js';

/**
 * Interface representing strongly-typed application and server configuration.
 */
export interface ServerConfig {
  /**
  Runtime environment (e.g., 'development', 'production', 'test')
  */
  nodeEnv: string;
  /**
  Whether the application is running in development mode
  */
  isDevelopment: boolean;
  /**
  Whether the application is running in production mode
  */
  isProduction: boolean;
  /**
  Whether the application is running in test mode
  */
  isTest: boolean;
  /**
  Server network port
  */
  port: number;
  /**
  Server host address
  */
  host: string;
  /**
  Log level for Pino logger
  */
  logLevel: string;
  /**
  Maximum grace period in milliseconds before forcing process exit during shutdown
  */
  shutdownTimeoutMs: number;
  /**
  Request body size limit (e.g., '1mb')
  */
  bodyLimit: string;
  /**
  Allowed CORS origins (string, array of strings, or '*' for all)
  */
  corsOrigin: string | string[];
  /**
  Rate limiting window duration in milliseconds
  */
  rateLimitWindowMs: number;
  /**
  Maximum number of requests allowed within the rate limiting window
  */
  rateLimitMax: number;
  /**
  Optional service or application name identifier
  */
  serviceName?: string;
  /**
  Optional secret(s) used by cookie-parser for signed cookies
  */
  cookieSecret?: string | string[];
  /**
  Optional secret(s) used by express-session
  */
  sessionSecret?: string | string[];
}

/**
 * Alias for ServerConfig for backward compatibility.
 */
export type AppConfig = ServerConfig;

/**
 * Parses and returns the application configuration loaded from environment variables,
 * optionally merged with custom overrides.
 *
 * @param [overrides] - Optional configuration overrides.
 * @param [env] - Optional environment dictionary (defaults to `process.env`).
 * @returns The resolved configuration object.
 */
export function loadConfig(
  overrides?: Partial<ServerConfig>,
  env: NodeJS.ProcessEnv = process.env
): ServerConfig {
  const nodeEnv = parseEnvString(
    overrides?.nodeEnv,
    env.NODE_ENV,
    DEFAULT_NODE_ENV
  );
  const isDevelopment = overrides?.isDevelopment ?? nodeEnv === 'development';
  const isProduction = overrides?.isProduction ?? nodeEnv === 'production';
  const isTest = overrides?.isTest ?? nodeEnv === 'test';

  const port = parseEnvInt(overrides?.port, env.PORT, DEFAULT_PORT);
  const host = parseEnvString(overrides?.host, env.HOST, DEFAULT_HOST);

  const defaultLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  const logLevel = parseEnvString(
    overrides?.logLevel,
    env.LOG_LEVEL,
    defaultLogLevel
  );

  const shutdownTimeoutMs = parseEnvInt(
    overrides?.shutdownTimeoutMs,
    env.SHUTDOWN_TIMEOUT_MS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS
  );

  const bodyLimit = parseEnvString(
    overrides?.bodyLimit,
    env.BODY_LIMIT,
    DEFAULT_BODY_LIMIT
  );

  const corsOrigin = parseEnvOriginList(
    overrides?.corsOrigin,
    env.CORS_ORIGIN,
    DEFAULT_CORS_ORIGIN
  );

  const rateLimitWindowMs = parseEnvInt(
    overrides?.rateLimitWindowMs,
    env.RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS
  );

  const rateLimitMax = parseEnvInt(
    overrides?.rateLimitMax,
    env.RATE_LIMIT_MAX,
    DEFAULT_RATE_LIMIT_MAX
  );

  const serviceName = overrides?.serviceName ?? env.SERVICE_NAME;
  const cookieSecret = overrides?.cookieSecret ?? env.COOKIE_SECRET;
  const sessionSecret = overrides?.sessionSecret ?? env.SESSION_SECRET;

  return {
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,
    port,
    host,
    logLevel,
    shutdownTimeoutMs,
    bodyLimit,
    corsOrigin,
    rateLimitWindowMs,
    rateLimitMax,
    serviceName,
    cookieSecret,
    sessionSecret,
  };
}

/**
 * Default singleton configuration instance.
 */
export const config: ServerConfig = loadConfig();
