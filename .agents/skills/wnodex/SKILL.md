---
name: wnodex
description: This skill should be used when the user asks to "build an Express server with wnodex", "create a wnodex app", "use the Wnodex class", "configure wnodex", "add a route in wnodex", "set up wnodex config", "use wnodex logger", "handle errors in wnodex", or mentions the wnodex package, its createApp/createServer/startServer factories, Wnodex class, loadConfig, createLogger, or HttpError. Covers the dual functional/object-oriented API, configuration, structured Pino logging, the error hierarchy, and server lifecycle.
---

# wnodex

## Purpose

`wnodex` (Web Node Express) is a production-ready Express.js server framework that ships a pre-wired middleware stack, typed environment configuration, structured Pino logging, extensible health checks, a rich error hierarchy, and graceful shutdown.

Use this skill to build an HTTP server with `wnodex`, configure it, and wire up logging, errors, and lifecycle. Consult the companion skills for focused areas:

- **`wnodex-config`** — `wnodex/config` and `wnodex/constants`, `loadConfig`, pure env parsers, and defaults.
- **`wnodex-errors`** — `wnodex/errors`, `BaseError`, `HttpError`, `ConfigError`, `ValidationError`, and error middlewares.
- **`wnodex-logger`** — `wnodex/logger`, `createLogger`, redaction, and child loggers.
- **`wnodex-middlewares`** — the middleware ecosystem, defaults, and ordering.
- **`wnodex-health-checks`** — health endpoints and custom plugins.
- **`wnodex-server`** — `wnodex/server`, server startup, graceful shutdown, and cleanup hooks.
- **`wnodex-development`** — contributing to the wnodex repository itself.

## When to Use

Activate this skill when building or configuring an HTTP server on top of `wnodex`, registering routes, choosing between the functional and class APIs, loading configuration, logging, throwing HTTP errors, or controlling startup and shutdown.

## Installation and Imports

```bash
pnpm add wnodex
```

Every feature is exported from the root entry point and from focused subpaths:

```typescript
import { createApp, createServer, startServer, Wnodex } from 'wnodex';
import { loadConfig } from 'wnodex/config';
import { HttpError, ValidationError } from 'wnodex/errors';
import { createLogger } from 'wnodex/logger';
import { setupGracefulShutdown } from 'wnodex/server';
import { DEFAULT_PORT, LOG_LEVELS } from 'wnodex/constants';
```

The package is ESM-only (`"type": "module"`). Use `.js` extensions in relative imports and `import`, never `require`.

## Choosing an API

Three entry points share the same core primitives. Pick the one that matches the task.

| API                                                | Use when                                                                      | Returns                           |
| :------------------------------------------------- | :---------------------------------------------------------------------------- | :-------------------------------- |
| `createServer(options)`                            | Prototyping or a single-call server                                           | `{ app, server, logger, config }` |
| `createApp(options)` + `startServer(app, options)` | Standard modular setup with separate app/server modules                       | `Express` and `Server`            |
| `new Wnodex(options)`                              | Object-oriented control, middleware shorthand toggles, `await server.start()` | `Wnodex` instance                 |

### Minimal server

```typescript
import { createServer } from 'wnodex';

const { app, server } = createServer({
  serviceName: 'My Service',
  routes: (app) => {
    app.get('/api/ping', (_req, res) => res.json({ message: 'pong' }));
  },
});
```

### Modular app plus server

```typescript
import type { Server } from 'node:http';
import type { Express } from 'express';
import { createApp, startServer } from 'wnodex';

export const app: Express = createApp({
  serviceName: 'Accounts Service',
  routes: myRouter,
});

export const server: Server = startServer(app, {
  serviceName: 'Accounts Service',
  cleanupHooks: [
    async () => {
      await db.disconnect();
    },
  ],
});
```

`startServer` accepts either `startServer(options)` or `startServer(app, options)`. It detects an Express app by the presence of `.listen`, so passing options alone creates the app internally.

### Object-oriented class

```typescript
import { Wnodex } from 'wnodex';

const server = new Wnodex({
  port: 3000,
  serviceName: 'Accounts Service',
  helmet: true,
  cors: { origin: 'https://my-app.com' },
  compression: true,
  cookieParser: { secret: 'my-cookie-secret' },
  session: { secret: 'my-session-secret' },
  passport: true,
  hpp: ['sort', 'filter'],
});

server.getApp().get('/', (_req, res) => res.json({ message: 'Hello!' }));
await server.start();
```

The class exposes `getApp()`, `getConfig()`, `getLogger()`, `getServer()`, `registerHealthPlugin(plugin)`, `start()`, and `shutdown(chores?)`.

## Middleware Defaults

The framework enables a security baseline by default. Know what is on before adding more.

| Middleware                      | Default | Enable explicitly with                                     |
| :------------------------------ | :------ | :--------------------------------------------------------- |
| Helmet                          | on      | `enableHelmet: true`                                       |
| CORS                            | on      | `enableCors: true`                                         |
| HPP                             | on      | `enableHpp: true`                                          |
| Rate limit                      | on      | `enableRateLimit: true`                                    |
| Body parser (JSON + urlencoded) | on      | `enableBodyParser: true`                                   |
| Health checks                   | on      | `enableHealthCheck: true`                                  |
| Compression                     | off     | `enableCompression: true` or `compressionOptions: {...}`   |
| Cookie parser                   | off     | `enableCookieParser: true` or `cookieParserOptions: {...}` |
| Session                         | off     | `enableSession: true` or `sessionOptions: {...}`           |
| Passport                        | off     | `enablePassport: true` or `passportOptions: {...}`         |
| Static assets                   | off     | `staticOptions: '/path/to/client'`                         |

The `Wnodex` class adds shorthand toggles (`helmet`, `cors`, `compression`, `bodyParsers`, `cookieParser`, `hpp`, `rateLimit`, `session`, `passport`, `healthCheck`, `staticAssets`) that accept either a boolean or an options object. Passing an object both enables the middleware and configures it. See `wnodex-middlewares` for the full matrix.

## Configuration

`loadConfig(overrides?, env?)` resolves a typed `ServerConfig` from explicit overrides, then environment variables, then defaults. Precedence is override > env > default.

```typescript
import { createApp, loadConfig } from 'wnodex';

const customConfig = loadConfig({
  port: 8080,
  bodyLimit: '10mb',
  corsOrigin: ['https://example.com'],
});

const app = createApp({ config: customConfig });
```

Recognized environment variables: `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT_MS`, `BODY_LIMIT`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `SERVICE_NAME`, `COOKIE_SECRET`, `SESSION_SECRET`.

`CORS_ORIGIN` accepts a comma-separated list, which is parsed into a `string[]`. Numeric variables fall back to the default when the value cannot be parsed, rather than throwing. The exported `config` singleton is `loadConfig()` evaluated once at import time.

## Logging

`createLogger(options?)` returns a Pino logger. In development it pipes through `pino-pretty`; in production it emits structured JSON. In test mode pretty formatting is disabled even when `isDevelopment` is true.

```typescript
import { createLogger } from 'wnodex';

const logger = createLogger({ level: 'debug', isDevelopment: true });
logger.info({ orderId }, 'Order accepted');
```

The logger redacts `req.headers.authorization`, `req.headers.cookie`, `password`, and `token` (`DEFAULT_REDACTED_PATHS`) by default. When overriding `redact`, spread `...DEFAULT_REDACTED_PATHS` into `redact.paths` to preserve the built-in redactions alongside your custom paths.

`createApp` stores the active logger on the app as `app.get('logger')`, and `startServer` reads it back, so passing `logger` to `createApp` is enough to have it used for lifecycle logs.

## Error Handling

Throw errors anywhere in a route or middleware; the centralized handler formats a consistent JSON response. The handler reads `err.statusCode` when present and defaults to 500.

```typescript
import { HttpError, ValidationError } from 'wnodex';

app.get('/users/:id', (req, res) => {
  const user = findUser(req.params.id);
  if (!user) throw HttpError.notFound('User not found');
  if (!isValid(user)) throw new ValidationError('Malformed user record');
  res.json(user);
});
```

`HttpError` supports two constructor signatures: `new HttpError(statusCode, message, metadata?)` and the legacy `new HttpError(message, statusCode?, metadata?)`. Prefer the status-first form or the static factories: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `internal`.

The hierarchy is `BaseError` → `HttpError`, `ConfigError`, `ValidationError`. `BaseError` carries a machine-readable `code` from `ERROR_CODES` plus optional `cause` and `context`, and implements `toJSON()` for structured logging.

Error responses hide internal 500 messages in production and include `stack` only in development. Pass `errorHandler` to `createApp` to replace the default handler entirely, or `notFoundHandler` to replace the 404 fallback.

## Routing and Post-Creation Routes

Pass routes through `routes` (a `Router`, a `RequestHandler`, or a `(app) => void` callback) or the `configure` callback.

After `createApp()` or `new Wnodex()` returns, the app's routing methods (`get`, `post`, `put`, `patch`, `delete`, `options`, `head`, `all`, `use`, `route`, `param`) are delegated to an internal router that sits before the 404 and error handlers. This means routes registered later still execute before the fallbacks.

One consequence matters: `app.get(name)` with a single string argument remains an Express settings lookup, not a route. Register a zero-argument-path GET route with `app.get('/path', handler)`.

Inject and read custom application settings through `settings` and `app.get(name)`:

```typescript
const app = createApp({
  serviceName: 'accounts-api',
  settings: { apiVersion: 'v1' },
});

app.get('/info', (req, res) => {
  res.json({
    service: req.app.get('serviceName'),
    version: req.app.get('apiVersion'),
  });
});
```

## Lifecycle and Shutdown

`startServer` and `createServer` attach graceful shutdown automatically. The `Wnodex` class attaches it only when `autoSignalShutdown: true`.

Signal handling registers `SIGTERM`, `SIGINT`, `uncaughtException`, and `unhandledRejection`. On trigger it stops accepting connections, closes idle keep-alive connections, runs `cleanupHooks` in order, then calls `process.exit`. A safety timer forces exit with code 1 after `timeoutMs` (default `SHUTDOWN_TIMEOUT_MS`, 10000 ms). Listeners detach once the server closes.

Use `closeServerGracefully(server, options)` when shutdown must not terminate the process, for example in tests or when another supervisor owns the process.

```typescript
import { closeServerGracefully, startServer } from 'wnodex';

const server = startServer({
  config: loadConfig({ port: 0 }),
  serviceName: 'Ephemeral',
});
// ... exercise the server ...
await closeServerGracefully(server, {
  cleanupHooks: [async () => redis.quit()],
});
```

## Verification Checklist

After wiring a wnodex server:

1. Confirm the intended middleware set is active — remember compression, cookie parser, session, and passport are opt-in.
2. Confirm `serviceName` is set; it appears in startup logs and the health report.
3. Confirm `cleanupHooks` release every resource the app opens (database, cache, queues).
4. Confirm routes registered after app creation respond before the 404 fallback.
5. Start with `port: 0` in tests to avoid port conflicts.

## Additional Resources

### Reference Files

- **`references/api-reference.md`** — exhaustive option and export tables for `createApp`, `startServer`, `createServer`, `Wnodex`, `loadConfig`, `createLogger`, and the error classes.

### Related Skills

- **`wnodex-config`** — environment resolution, pure parsers, and framework constants.
- **`wnodex-errors`** — error hierarchy, `HttpError` factories, and error handling middlewares.
- **`wnodex-logger`** — Pino logger setup, redaction, and request-scoped child loggers.
- **`wnodex-middlewares`** — middleware options, defaults, ordering, and recipes.
- **`wnodex-health-checks`** — health endpoints, probes, and plugin authoring.
- **`wnodex-server`** — server startup, graceful shutdown, and cleanup hooks.
- **`wnodex-development`** — repository architecture, conventions, and release workflow.
