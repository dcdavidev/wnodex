---
name: wnodex-logger
description: This skill should be used when the user asks to "configure logging in wnodex", "use createLogger in wnodex", "redact sensitive fields in wnodex logs", "create a silent logger for tests", "use Pino child loggers with wnodex", or mentions wnodex/logger, createLogger, CreateLoggerOptions, logger, LOG_LEVELS, LogLevel, or DEFAULT_REDACTED_PATHS. Covers structured Pino logging, development pino-pretty formatting, automatic field redaction, Express app logger propagation, and silent test logging.
---

# wnodex Structured Logging

## Purpose

`wnodex/logger` provides a pre-configured [Pino](https://getpino.io/) logger factory (`createLogger`) and a shared default `logger` singleton. It formats logs with `pino-pretty` in development and emits high-performance structured JSON in production and test environments, with automatic redaction of sensitive authentication and credential fields.

Use this skill to create and customize Pino loggers, redact sensitive fields, attach request-scoped child loggers, and silence logs during automated tests.

## When to Use

Activate this skill when configuring log levels or output formats, redacting sensitive request/payload fields, accessing the active logger inside Express routes, creating request-scoped child loggers, or silencing output in Vitest suites.

## Subpath Imports

```typescript
import {
  createLogger,
  type CreateLoggerOptions,
  LOG_LEVELS,
  type LogLevel,
  logger,
} from 'wnodex/logger';
import { DEFAULT_REDACTED_PATHS } from 'wnodex/constants';
```

All symbols are also exported from the root `wnodex` package.

## `createLogger(options?): Logger`

`CreateLoggerOptions` extends Pino's `LoggerOptions` with two environment flags:

| Option          | Type            | Default                | Purpose                                                        |
| :-------------- | :-------------- | :--------------------- | :------------------------------------------------------------- |
| `level`         | `LogLevel`      | `config.logLevel`      | Minimum log level (`'debug'` in dev, `'info'` otherwise)       |
| `isDevelopment` | `boolean`       | `config.isDevelopment` | Enables `pino-pretty` stream when `true` and `isTest` is false |
| `isTest`        | `boolean`       | `config.isTest`        | Disables `pino-pretty` even if `isDevelopment` is `true`       |
| `...pinoOpts`   | `LoggerOptions` | —                      | Forwarded directly to `pino(baseOptions)`                      |

### Built-in Base Configuration

Every logger created by `createLogger` starts with:

- **`level`**: `options?.level ?? config.logLevel`
- **`timestamp`**: `pino.stdTimeFunctions.isoTime` (ISO-8601 timestamps)
- **`formatters.level`**: `(label) => ({ level: label })` (emits string level labels like `"level": "info"` instead of numeric codes)
- **`redact`**: `{ paths: [...DEFAULT_REDACTED_PATHS], censor: '[REDACTED]' }`

### Environment Output Modes

| Mode                         | Condition                    | Output Format                                                                                               |
| :--------------------------- | :--------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Development (pretty)**     | `isDevelopment && !isTest`   | `pino-pretty` stream (`colorize: true`, `translateTime: 'yyyy-mm-dd HH:MM:ss.l'`, `ignore: 'pid,hostname'`) |
| **Production / Test (JSON)** | `!isDevelopment \|\| isTest` | Structured single-line NDJSON to stdout                                                                     |

## Log Levels (`LOG_LEVELS`)

```typescript
const LOG_LEVELS = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
  SILENT: 'silent',
} as const;
```

Use `LOG_LEVELS.SILENT` (`'silent'`) in test suites to suppress all terminal output while still allowing `vi.spyOn(logger, 'error')` assertions.

## Sensitive Data Redaction

By default, `createLogger` redacts the four paths in `DEFAULT_REDACTED_PATHS`:

- `'req.headers.authorization'`
- `'req.headers.cookie'`
- `'password'`
- `'token'`

Matched fields are replaced with `'[REDACTED]'`.

### Extending Redacted Paths

Because `...pinoOverrides` spreads after the default `redact` object in `createLogger`, passing a custom `redact` option replaces the default `redact` configuration. Always spread `DEFAULT_REDACTED_PATHS` when adding custom redaction paths so you do not lose the built-in protections:

```typescript
import { createLogger, DEFAULT_REDACTED_PATHS } from 'wnodex';

export const logger = createLogger({
  redact: {
    paths: [
      ...DEFAULT_REDACTED_PATHS,
      'apiKey',
      'creditCard.cvv',
      'req.headers["x-api-key"]',
    ],
    censor: '[REDACTED]',
  },
});
```

## Logger Propagation Across `wnodex`

When you pass a custom `logger` to `createApp`, `createServer`, or `new Wnodex`:

1. `createApp` stores it on the Express instance via `app.set('logger', activeLogger)`.
2. `createApp` passes `activeLogger` into the default `createErrorHandler({ logger: activeLogger })`.
3. `startServer(app, options)` reads `options.logger ?? app.get('logger') ?? defaultLogger` for startup and graceful shutdown logs.
4. `Wnodex` creates a logger aligned with `this.config` (`level`, `isDevelopment`, `isTest`) when `options.logger` is omitted, and exposes it via `server.getLogger()`.

Retrieve the active logger inside any route or middleware via `req.app.get('logger')`:

```typescript
import type { Logger } from 'pino';

app.post('/checkout', (req, res) => {
  const reqLogger = req.app.get('logger') as Logger;
  reqLogger.info({ cartId: req.body.cartId }, 'Processing checkout');
  res.json({ status: 'ok' });
});
```

## Verification Checklist

1. Confirm structured metadata is passed as the **first** argument (`logger.info({ userId }, 'Message')`), following Pino's `(mergingObject, message)` signature.
2. Confirm `DEFAULT_REDACTED_PATHS` is preserved whenever overriding `redact` in `createLogger`.
3. Confirm tests pass `createLogger({ level: 'silent' })` so test runs remain quiet.
4. Confirm error objects are logged under the `err` key (`logger.error({ err }, 'Failed')`) so Pino's standard error serializer captures `type`, `message`, `stack`, and custom `BaseError` properties.

## Additional Resources

### Reference Files

- **`references/logging-recipes.md`** — recipes for request-scoped child loggers with correlation IDs, custom redaction rules, spying on logger methods in Vitest, and service-level child loggers.

### Related Skills

- **`wnodex`** — core API, application setup, and overview.
- **`wnodex-config`** — `LOG_LEVEL`, `isDevelopment`, `isTest`, and `DEFAULT_REDACTED_PATHS`.
- **`wnodex-errors`** — how `createErrorHandler` logs unhandled request errors.
- **`wnodex-server`** — how `startServer` and `setupGracefulShutdown` log lifecycle transitions.
- **`wnodex-development`** — testing conventions with silent loggers.
