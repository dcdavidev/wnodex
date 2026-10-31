---
name: wnodex-config
description: This skill should be used when the user asks to "configure wnodex environment variables", "use loadConfig in wnodex", "parse environment variables with wnodex", "override ServerConfig", "read wnodex constants", or mentions wnodex/config, wnodex/constants, loadConfig, ServerConfig, AppConfig, parseEnvString, parseEnvInt, isEnvFlagEnabled, parseEnvOriginList, or DEFAULT_* constants. Covers environment resolution precedence, pure parsers, default constants, and extending configuration.
---

# wnodex Configuration & Constants

## Purpose

`wnodex/config` and `wnodex/constants` provide typed environment configuration resolution, pure environment variable parsers, and centralized framework defaults. Every built-in middleware, logger, and lifecycle helper reads from `ServerConfig` and `DEFAULT_*` constants rather than inspecting `process.env` directly.

Use this skill to load or override `ServerConfig`, parse custom environment variables using the built-in pure parsers, or reference framework default constants.

## When to Use

Activate this skill when configuring ports, hosts, body limits, rate limits, CORS origins, secrets, or shutdown timeouts via environment variables or code overrides, when writing custom configuration loaders with `parseEnv*` helpers, or when importing `DEFAULT_*` constants.

## Subpath Imports

All symbols are exported from both the root package and their dedicated subpaths:

```typescript
import {
  type AppConfig,
  config,
  isEnvFlagEnabled,
  loadConfig,
  parseEnvInt,
  parseEnvOriginList,
  parseEnvString,
  type ServerConfig,
} from 'wnodex/config';
import {
  CRITICAL_HEAP_USAGE_RATIO,
  DEFAULT_BODY_LIMIT,
  DEFAULT_CORS_ALLOWED_HEADERS,
  DEFAULT_CORS_METHODS,
  DEFAULT_CORS_ORIGIN,
  DEFAULT_HEALTH_PATH,
  DEFAULT_HOST,
  DEFAULT_IMMUTABLE_STATIC_MAX_AGE,
  DEFAULT_NODE_ENV,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_REDACTED_PATHS,
  DEFAULT_SERVICE_NAME,
  DEFAULT_SESSION_COOKIE_MAX_AGE,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  DEFAULT_STATIC_MAX_AGE,
  IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY,
  LOG_LEVELS,
  type LogLevel,
  SHOULD_DEFAULT_SESSION_RESAVE,
  SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED,
} from 'wnodex/constants';
```

## Resolution Precedence

`loadConfig(overrides?, env?)` resolves a `ServerConfig` object using strict three-tier precedence:

1. **Explicit `overrides`** (`Partial<ServerConfig>`) passed in code.
2. **Environment dictionary** (`env`, which defaults to `process.env`).
3. **Default constants** from `wnodex/constants`.

```typescript
import { createApp, loadConfig } from 'wnodex';

const customConfig = loadConfig({
  port: 8080,
  bodyLimit: '5mb',
  corsOrigin: ['https://app.example.com', 'https://admin.example.com'],
});

const app = createApp({ config: customConfig });
```

The exported `config` singleton is `loadConfig()` evaluated once at module import time. Pass a fresh `loadConfig(...)` result when you need per-instance overrides or isolated test configurations.

## `ServerConfig` Reference

`AppConfig` is a type alias for `ServerConfig`.

| Field               | Type                       | Env Variable           | Default Constant               | Default Value                      |
| :------------------ | :------------------------- | :--------------------- | :----------------------------- | :--------------------------------- |
| `nodeEnv`           | `string`                   | `NODE_ENV`             | `DEFAULT_NODE_ENV`             | `'development'`                    |
| `isDevelopment`     | `boolean`                  | derived                | —                              | `nodeEnv === 'development'`        |
| `isProduction`      | `boolean`                  | derived                | —                              | `nodeEnv === 'production'`         |
| `isTest`            | `boolean`                  | derived                | —                              | `nodeEnv === 'test'`               |
| `port`              | `number`                   | `PORT`                 | `DEFAULT_PORT`                 | `3000`                             |
| `host`              | `string`                   | `HOST`                 | `DEFAULT_HOST`                 | `'localhost'`                      |
| `logLevel`          | `string`                   | `LOG_LEVEL`            | `LOG_LEVELS.DEBUG` / `.INFO`   | `'debug'` (dev) / `'info'` (other) |
| `shutdownTimeoutMs` | `number`                   | `SHUTDOWN_TIMEOUT_MS`  | `DEFAULT_SHUTDOWN_TIMEOUT_MS`  | `10000` (10s)                      |
| `bodyLimit`         | `string`                   | `BODY_LIMIT`           | `DEFAULT_BODY_LIMIT`           | `'1mb'`                            |
| `corsOrigin`        | `string \| string[]`       | `CORS_ORIGIN`          | `DEFAULT_CORS_ORIGIN`          | `'*'`                              |
| `rateLimitWindowMs` | `number`                   | `RATE_LIMIT_WINDOW_MS` | `DEFAULT_RATE_LIMIT_WINDOW_MS` | `900000` (15m)                     |
| `rateLimitMax`      | `number`                   | `RATE_LIMIT_MAX`       | `DEFAULT_RATE_LIMIT_MAX`       | `100`                              |
| `serviceName`       | `string \| undefined`      | `SERVICE_NAME`         | —                              | `undefined`                        |
| `cookieSecret`      | `string \| string[]` (opt) | `COOKIE_SECRET`        | —                              | `undefined`                        |
| `sessionSecret`     | `string \| string[]` (opt) | `SESSION_SECRET`       | —                              | `undefined`                        |

Note on `defaultLogLevel`: `loadConfig` derives `isDevelopment` first (respecting `overrides.isDevelopment ?? nodeEnv === 'development'`) and selects `LOG_LEVELS.DEBUG` when `isDevelopment` is true, or `LOG_LEVELS.INFO` otherwise (including when `NODE_ENV=test`).

## Pure Environment Parsers

`wnodex/config` exports four pure, dependency-free parser functions. They never read `process.env` directly and never throw on malformed input — they fall back to the provided default.

### `parseEnvString(override, envValue, fallback): string`

- Returns `override` whenever `override !== undefined` (even if `override` is an empty string).
- Otherwise returns `envValue` if it is defined and `envValue.trim() !== ''`.
- Otherwise returns `fallback`.

### `parseEnvInt(override, envValue, fallback): number`

- Returns `override` when `override !== undefined && !Number.isNaN(override)`.
- Otherwise, if `envValue` is non-empty after trimming, converts it with `Math.trunc(Number(envValue))` and returns the integer when not `NaN`.
- Otherwise returns `fallback`.

### `isEnvFlagEnabled(isOverrideEnabled, envValue, isFallbackEnabled): boolean`

- Returns `isOverrideEnabled` when `isOverrideEnabled !== undefined`.
- Otherwise normalizes `envValue.trim().toLowerCase()`:
  - `'true'`, `'1'`, `'yes'` → `true`
  - `'false'`, `'0'`, `'no'` → `false`
- Otherwise returns `isFallbackEnabled`.

### `parseEnvOriginList(override, envValue, fallback): string | string[]`

- Returns `override` when `override !== undefined`.
- Resolves `raw` from `envValue` (if non-blank) or `fallback`.
- If `raw` contains `','`, splits on commas, trims each item, filters out empty strings, and returns `string[]`.
- Otherwise returns `raw` as a single `string`.

```typescript
import {
  isEnvFlagEnabled,
  parseEnvInt,
  parseEnvOriginList,
} from 'wnodex/config';

const maxPoolSize = parseEnvInt(undefined, process.env.DB_POOL_MAX, 10);
const metricsEnabled = isEnvFlagEnabled(
  undefined,
  process.env.ENABLE_METRICS,
  false
);
const trustedOrigins = parseEnvOriginList(
  undefined,
  process.env.CORS_ORIGIN,
  '*'
);
```

## Framework Constants (`wnodex/constants`)

Import constants from `wnodex/constants` instead of hardcoding magic values in application or middleware code:

| Constant                                    | Value                                                                             | Purpose                                     |
| :------------------------------------------ | :-------------------------------------------------------------------------------- | :------------------------------------------ |
| `DEFAULT_NODE_ENV`                          | `'development'`                                                                   | Fallback `NODE_ENV`                         |
| `DEFAULT_PORT`                              | `3000`                                                                            | Fallback HTTP listener port                 |
| `DEFAULT_HOST`                              | `'localhost'`                                                                     | Fallback HTTP listener host                 |
| `DEFAULT_SERVICE_NAME`                      | `'Express server'`                                                                | Fallback name in startup logs & health      |
| `DEFAULT_SHUTDOWN_TIMEOUT_MS`               | `10_000`                                                                          | Force-exit timeout during graceful shutdown |
| `DEFAULT_BODY_LIMIT`                        | `'1mb'`                                                                           | JSON and URL-encoded body size limit        |
| `DEFAULT_CORS_ORIGIN`                       | `'*'`                                                                             | Fallback CORS origin                        |
| `DEFAULT_CORS_METHODS`                      | `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`                            | Allowed CORS HTTP methods                   |
| `DEFAULT_CORS_ALLOWED_HEADERS`              | `['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-Id']` | Allowed CORS request headers                |
| `DEFAULT_RATE_LIMIT_WINDOW_MS`              | `900_000` (15m)                                                                   | Rate limiter window                         |
| `DEFAULT_RATE_LIMIT_MAX`                    | `100`                                                                             | Max requests per IP per window              |
| `DEFAULT_SESSION_COOKIE_MAX_AGE`            | `86_400_000` (24h)                                                                | Session cookie `maxAge`                     |
| `IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY`       | `true`                                                                            | Session cookie `httpOnly` flag              |
| `SHOULD_DEFAULT_SESSION_RESAVE`             | `false`                                                                           | `express-session` `resave`                  |
| `SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED` | `false`                                                                           | `express-session` `saveUninitialized`       |
| `DEFAULT_STATIC_MAX_AGE`                    | `'1h'`                                                                            | Root static assets `Cache-Control` max-age  |
| `DEFAULT_IMMUTABLE_STATIC_MAX_AGE`          | `'1y'`                                                                            | `/static` immutable assets max-age          |
| `DEFAULT_HEALTH_PATH`                       | `'/health'`                                                                       | Base path for health endpoints              |
| `CRITICAL_HEAP_USAGE_RATIO`                 | `0.98`                                                                            | Readiness heap saturation threshold (98%)   |
| `LOG_LEVELS`                                | `{ FATAL, ERROR, WARN, INFO, DEBUG, TRACE, SILENT }`                              | Pino log level constants                    |
| `DEFAULT_REDACTED_PATHS`                    | `['req.headers.authorization', 'req.headers.cookie', 'password', 'token']`        | Default Pino redaction paths                |

## Passing Config to `Wnodex` vs `createApp`

- **`createApp({ config })` / `startServer(app, { config })` / `createServer({ config })`**: Pass a `ServerConfig` built with `loadConfig(...)`.
- **`new Wnodex(options)`**: Accepts top-level `Partial<ServerConfig>` properties directly (`port`, `host`, `bodyLimit`, `corsOrigin`, `serviceName`, etc.) and calls `loadConfig(options)` internally unless `options.config` is explicitly provided.

## Verification Checklist

1. Confirm `loadConfig({ port: 0 })` is used in tests that start a real HTTP listener so the OS assigns an ephemeral port.
2. Confirm `CORS_ORIGIN` in production is set to explicit origins (comma-separated or `string[]`) rather than `'*'` when `credentials: true` is active.
3. Confirm `SESSION_SECRET` (or `sessionOptions.secret`) is configured before enabling sessions, otherwise `ConfigError` is thrown at app creation.
4. Confirm custom env variables use `parseEnvString`, `parseEnvInt`, `isEnvFlagEnabled`, or `parseEnvOriginList` with safe defaults or fail-fast `ConfigError` validation.

## Additional Resources

### Reference Files

- **`references/config-recipes.md`** — recipes for extending `ServerConfig` with custom application variables, fail-fast startup validation with `ConfigError`, multi-environment `.env` patterns, and isolated unit testing with custom `env` dictionaries.

### Related Skills

- **`wnodex`** — core API, application setup, routing, and overview.
- **`wnodex-errors`** — `ConfigError` and the structured error hierarchy.
- **`wnodex-logger`** — `LOG_LEVELS`, `DEFAULT_REDACTED_PATHS`, and Pino logger configuration.
- **`wnodex-middlewares`** — how middlewares consume `ServerConfig` and `DEFAULT_*` constants.
- **`wnodex-server`** — how `host`, `port`, and `shutdownTimeoutMs` drive server lifecycle.
- **`wnodex-development`** — repository architecture and conventions.
