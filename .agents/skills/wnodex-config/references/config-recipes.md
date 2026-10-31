# Configuration Recipes

Copy-ready patterns for extending, validating, and testing configuration with `wnodex/config` and `wnodex/constants`.

## 1. Extending `ServerConfig` for Application-Specific Variables

Intent: combine `wnodex`'s `ServerConfig` with domain-specific environment variables using the built-in pure parsers.

```typescript
import process from 'node:process';
import {
  isEnvFlagEnabled,
  loadConfig,
  parseEnvInt,
  parseEnvString,
  type ServerConfig,
} from 'wnodex/config';

export interface MyServiceConfig extends ServerConfig {
  databaseUrl: string;
  redisUrl: string;
  dbPoolMax: number;
  enableSwagger: boolean;
}

export function loadServiceConfig(
  overrides?: Partial<MyServiceConfig>,
  env: NodeJS.ProcessEnv = process.env
): MyServiceConfig {
  const base = loadConfig(overrides, env);

  return {
    ...base,
    databaseUrl: parseEnvString(
      overrides?.databaseUrl,
      env.DATABASE_URL,
      'postgresql://localhost:5432/app'
    ),
    redisUrl: parseEnvString(
      overrides?.redisUrl,
      env.REDIS_URL,
      'redis://localhost:6379'
    ),
    dbPoolMax: parseEnvInt(overrides?.dbPoolMax, env.DB_POOL_MAX, 10),
    enableSwagger: isEnvFlagEnabled(
      overrides?.enableSwagger,
      env.ENABLE_SWAGGER,
      base.isDevelopment
    ),
  };
}
```

Notes: accepting `env: NodeJS.ProcessEnv = process.env` mirrors `loadConfig`'s signature and keeps your custom config loader unit-testable without mutating `process.env`.

## 2. Fail-Fast Startup Validation with `ConfigError`

Intent: throw a structured `ConfigError` at startup when required production secrets or connection strings are missing.

```typescript
import process from 'node:process';
import { loadConfig, type ServerConfig } from 'wnodex/config';
import { ConfigError } from 'wnodex/errors';

export function loadValidatedConfig(
  overrides?: Partial<ServerConfig>,
  env: NodeJS.ProcessEnv = process.env
): ServerConfig {
  const resolved = loadConfig(overrides, env);

  if (resolved.isProduction) {
    if (!resolved.sessionSecret) {
      throw new ConfigError(
        'SESSION_SECRET is required in production.',
        undefined,
        { nodeEnv: resolved.nodeEnv }
      );
    }

    if (resolved.corsOrigin === '*') {
      throw new ConfigError(
        'CORS_ORIGIN must not be wildcard (*) in production.',
        undefined,
        { corsOrigin: resolved.corsOrigin }
      );
    }
  }

  return resolved;
}
```

Notes: `ConfigError` sets `code: 'CONFIG_ERROR'` and serializes `context` cleanly via `toJSON()`.

## 3. Injecting Custom Settings into Express (`settings`)

Intent: expose custom configuration values to route handlers via `req.app.get(key)` without global singletons.

```typescript
import { createApp } from 'wnodex';
import { loadServiceConfig } from './config.js';

const serviceConfig = loadServiceConfig();

export const app = createApp({
  config: serviceConfig,
  serviceName: 'billing-service',
  settings: {
    serviceConfig,
    enableSwagger: serviceConfig.enableSwagger,
  },
});

app.get('/api/meta', (req, res) => {
  const cfg = req.app.get('serviceConfig') as typeof serviceConfig;
  res.json({
    env: cfg.nodeEnv,
    swagger: cfg.enableSwagger,
  });
});
```

Notes: `createApp` also automatically sets `app.set('logger', activeLogger)`, `app.set('nodeEnv', activeConfig.nodeEnv)`, and `app.set('serviceName', resolvedServiceName)`.

## 4. Testing Configuration Resolution without Mutating `process.env`

Intent: test environment variable combinations deterministically in Vitest.

```typescript
import { describe, expect, it } from 'vitest';
import { loadConfig } from 'wnodex/config';

describe('configuration resolution', () => {
  it('parses comma-separated CORS_ORIGIN and applies code overrides', () => {
    const cfg = loadConfig(
      { port: 0 },
      {
        NODE_ENV: 'production',
        PORT: '8080',
        CORS_ORIGIN: 'https://a.example.com, https://b.example.com',
        RATE_LIMIT_MAX: '500',
      }
    );

    expect(cfg.port).toBe(0); // override wins over env.PORT
    expect(cfg.isProduction).toBe(true);
    expect(cfg.logLevel).toBe('info');
    expect(cfg.corsOrigin).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(cfg.rateLimitMax).toBe(500);
  });
});
```
