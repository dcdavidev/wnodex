import { describe, expect, it } from 'vitest';

import {
  config,
  DEFAULT_BODY_LIMIT,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  isEnvFlagEnabled,
  loadConfig,
  parseEnvInt,
  parseEnvOriginList,
  parseEnvString,
} from '../src/index.js';

describe('config/parsers', () => {
  it('parses strings with explicit override, env value, and fallback', () => {
    expect(parseEnvString(undefined, 'production', 'development')).toBe(
      'production'
    );
    expect(parseEnvString('test', 'production', 'development')).toBe('test');
    expect(parseEnvString(undefined, ' '.repeat(3), 'development')).toBe(
      'development'
    );
    expect(parseEnvString(undefined, undefined, 'fallback')).toBe('fallback');
  });

  it('parses integers and falls back on NaN or empty values', () => {
    expect(parseEnvInt(undefined, '8080', 3000)).toBe(8080);
    expect(parseEnvInt(4000, '8080', 3000)).toBe(4000);
    expect(parseEnvInt(NaN, '8080', 3000)).toBe(8080);
    expect(parseEnvInt(undefined, 'invalid', 3000)).toBe(3000);
    expect(parseEnvInt(undefined, '', 3000)).toBe(3000);
    expect(parseEnvInt(undefined, undefined, 3000)).toBe(3000);
  });

  it('evaluates boolean environment flags across truthy and falsy representations', () => {
    expect(isEnvFlagEnabled(undefined, 'true', false)).toBe(true);
    expect(isEnvFlagEnabled(undefined, '1', false)).toBe(true);
    expect(isEnvFlagEnabled(undefined, 'YES', false)).toBe(true);
    expect(isEnvFlagEnabled(undefined, 'false', true)).toBe(false);
    expect(isEnvFlagEnabled(undefined, '0', true)).toBe(false);
    expect(isEnvFlagEnabled(undefined, 'no', true)).toBe(false);
    expect(isEnvFlagEnabled(undefined, 'unknown', true)).toBe(true);
    expect(isEnvFlagEnabled(true, 'false', false)).toBe(true);
    expect(isEnvFlagEnabled(false, 'true', true)).toBe(false);
  });

  it('parses single and comma-separated origin lists', () => {
    expect(parseEnvOriginList(undefined, undefined, '*')).toBe('*');
    expect(parseEnvOriginList(undefined, 'https://a.com', '*')).toBe(
      'https://a.com'
    );
    expect(
      parseEnvOriginList(undefined, 'https://a.com, https://b.com , ', '*')
    ).toEqual(['https://a.com', 'https://b.com']);
    expect(
      parseEnvOriginList(['https://override.com'], 'https://a.com', '*')
    ).toEqual(['https://override.com']);
  });
});

describe('config/env', () => {
  it('provides sensible default values when env is empty', () => {
    const resolved = loadConfig(undefined, {});

    expect(resolved.nodeEnv).toBe('development');
    expect(resolved.isDevelopment).toBe(true);
    expect(resolved.isProduction).toBe(false);
    expect(resolved.isTest).toBe(false);
    expect(resolved.port).toBe(DEFAULT_PORT);
    expect(resolved.host).toBe(DEFAULT_HOST);
    expect(resolved.logLevel).toBe('debug');
    expect(resolved.shutdownTimeoutMs).toBe(DEFAULT_SHUTDOWN_TIMEOUT_MS);
    expect(resolved.bodyLimit).toBe(DEFAULT_BODY_LIMIT);
    expect(resolved.corsOrigin).toBe('*');
    expect(resolved.rateLimitWindowMs).toBe(DEFAULT_RATE_LIMIT_WINDOW_MS);
    expect(resolved.rateLimitMax).toBe(DEFAULT_RATE_LIMIT_MAX);
    expect(resolved.serviceName).toBeUndefined();
    expect(resolved.cookieSecret).toBeUndefined();
    expect(resolved.sessionSecret).toBeUndefined();
  });

  it('loads configuration from custom env dictionary and applies overrides', () => {
    const resolved = loadConfig(
      { port: 9090, serviceName: 'custom-svc' },
      {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        SHUTDOWN_TIMEOUT_MS: '5000',
        BODY_LIMIT: '5mb',
        CORS_ORIGIN: 'https://one.example.com,https://two.example.com',
        RATE_LIMIT_WINDOW_MS: '60000',
        RATE_LIMIT_MAX: '250',
        COOKIE_SECRET: 'cookie-sec',
        SESSION_SECRET: 'session-sec',
      }
    );

    expect(resolved.port).toBe(9090);
    expect(resolved.host).toBe('0.0.0.0');
    expect(resolved.nodeEnv).toBe('production');
    expect(resolved.isProduction).toBe(true);
    expect(resolved.isDevelopment).toBe(false);
    expect(resolved.isTest).toBe(false);
    expect(resolved.logLevel).toBe('info');
    expect(resolved.shutdownTimeoutMs).toBe(5000);
    expect(resolved.bodyLimit).toBe('5mb');
    expect(resolved.corsOrigin).toEqual([
      'https://one.example.com',
      'https://two.example.com',
    ]);
    expect(resolved.rateLimitWindowMs).toBe(60_000);
    expect(resolved.rateLimitMax).toBe(250);
    expect(resolved.serviceName).toBe('custom-svc');
    expect(resolved.cookieSecret).toBe('cookie-sec');
    expect(resolved.sessionSecret).toBe('session-sec');
  });

  it('detects test environment correctly and exports default singleton config', () => {
    const testCfg = loadConfig(undefined, { NODE_ENV: 'test' });
    expect(testCfg.isTest).toBe(true);
    expect(testCfg.isDevelopment).toBe(false);
    expect(testCfg.logLevel).toBe('info');
    expect(config).toBeDefined();
  });
});
