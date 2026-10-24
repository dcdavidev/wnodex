/**
 * @file Pino application logger setup and configuration.
 * @module logger/logger
 */

import pretty from 'pino-pretty';

import pino, { type Logger, type LoggerOptions } from 'pino';

import { config } from '../config/env.js';
import { DEFAULT_REDACTED_PATHS } from '../constants/index.js';

export { LOG_LEVELS, type LogLevel } from '../constants/index.js';

/**
 * Custom logger configuration options.
 */
export interface CreateLoggerOptions extends LoggerOptions {
  /**
  Whether the logger runs in development mode (enables pino-pretty)
  */
  isDevelopment?: boolean;
  /**
  Whether the logger runs in test mode (disables pretty formatting)
  */
  isTest?: boolean;
}

/**
 * Creates and configures a Pino logger instance.
 *
 * In development environments, logs are formatted via `pino-pretty`
 * for colored, human-readable terminal output. In production, logs are output
 * as structured JSON for log collectors and aggregators.
 *
 * @param [options] - Optional logger configuration overrides.
 * @returns The configured Pino logger instance.
 */
export function createLogger(options?: CreateLoggerOptions): Logger {
  const isDev = options?.isDevelopment ?? config.isDevelopment;
  const isTest = options?.isTest ?? config.isTest;
  const level = options?.level ?? config.logLevel;

  const {
    isDevelopment: _isDev,
    isTest: _isTest,
    ...pinoOverrides
  } = options ?? {};

  const baseOptions: LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact: {
      paths: [...DEFAULT_REDACTED_PATHS],
      censor: '[REDACTED]',
    },
    ...pinoOverrides,
  };

  if (isDev && !isTest) {
    const prettyStream = pretty({
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false,
    });

    return pino(baseOptions, prettyStream);
  }

  return pino(baseOptions);
}

/**
 * Default shared application logger instance.
 */
export const logger: Logger = createLogger();
