import { describe, expect, it } from 'vitest';

import { createLogger, LOG_LEVELS, logger } from '../src/index.js';

describe('logger', () => {
  it('exports default logger and standard LOG_LEVELS constants', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(LOG_LEVELS).toEqual({
      FATAL: 'fatal',
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug',
      TRACE: 'trace',
      SILENT: 'silent',
    });
  });

  it('creates logger in production, development, and test modes', () => {
    const prodLogger = createLogger({
      level: LOG_LEVELS.WARN,
      isDevelopment: false,
      isTest: false,
    });
    expect(prodLogger.level).toBe('warn');

    const devLogger = createLogger({
      level: LOG_LEVELS.DEBUG,
      isDevelopment: true,
      isTest: false,
    });
    expect(devLogger.level).toBe('debug');

    const testLogger = createLogger({
      level: LOG_LEVELS.SILENT,
      isDevelopment: true,
      isTest: true,
    });
    expect(testLogger.level).toBe('silent');
  });
});
