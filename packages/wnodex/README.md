# wnodex

Reusable, modular, and production-ready Express.js server framework with built-in security middlewares, compression, cookie/body parsing, session & Passport authentication, structured Pino logging, extensible MVC health checks, and graceful shutdown.

## Features

- **Flexible Dual API**: Use the functional factories (`createServer`, `createApp`, `startServer`) or the object-oriented `Wnodex` class (`new Wnodex()`), both powered by the same DRY core primitives.
- **Modular Subpath Exports**: Import everything from `wnodex` or cherry-pick dedicated submodules (`wnodex/config`, `wnodex/errors`, `wnodex/health`, `wnodex/logger`, `wnodex/middlewares`, `wnodex/server`, `wnodex/constants`).
- **Complete Integrated Middleware Ecosystem**:
  - **Helmet** (`createHelmetMiddleware`, `helmetMiddleware`): Security HTTP headers (enabled by default).
  - **CORS** (`createCorsMiddleware`, `createCorsOptions`, `corsMiddleware`): Cross-Origin Resource Sharing (enabled by default).
  - **Compression** (`createCompressionMiddleware`, `compressionMiddleware`): Gzip/deflate response compression.
  - **Body Parser** (`createBodyParserMiddlewares`, `createJsonBodyParser`, `createUrlencodedBodyParser`): JSON and URL-encoded body parsing with configurable limits and granular `{ json, urlencoded }` options (enabled by default).
  - **Cookie Parser** (`createCookieParserMiddleware`, `cookieParserMiddleware`): Signed and unsigned cookie parsing.
  - **HPP** (`createHppMiddleware`, `hppMiddleware`): HTTP Parameter Pollution protection with whitelist support (enabled by default).
  - **Rate Limiter** (`createRateLimiter`, `rateLimiter`): DDoS / brute-force protection with Draft-8 headers (enabled by default).
  - **Session** (`createSessionMiddleware`, `createSessionOptions`): `express-session` integration with secure defaults (`httpOnly`, `resave: false`, `saveUninitialized: false`, `secure` in production).
  - **Passport** (`configurePassport`, `createPassportMiddlewares`): Passport.js authentication initialization and session binding.
  - **Static Assets** (`registerStaticAssets`, `StaticAssets`): Immutable `/static` (`1y` cache) and root static file serving.
- **Structured Logging**: High-performance Pino logger with `pino-pretty` in development and structured JSON in production. Sensitive fields (passwords, tokens, cookies, auth headers) are redacted automatically.
- **Extensible Health Checks**: Built-in `/health`, `/health/live`, and `/health/ready` endpoints supporting custom service plugins (e.g. database ping, cache probe) with option to disable or customize.
- **Graceful Shutdown**: Drains in-flight connections on `SIGTERM` / `SIGINT`, closes idle keep-alive connections, runs custom cleanup hooks (e.g. database disconnects), and enforces a safety timeout.
- **Centralized Error Handling**: Standardized JSON error responses and rich error hierarchy (`HttpError`, `BaseError`, `ConfigError`, `ValidationError`).

---

## Installation

```bash
pnpm add wnodex
# or
npm install wnodex
```

---

## Quick Start

### 1. Minimal Server (1 Call)

```typescript
import { createServer } from 'wnodex';

const { app, server } = createServer({
  serviceName: 'My Service',
  routes: (app) => {
    app.get('/api/ping', (_req, res) => {
      res.json({ message: 'pong' });
    });
  },
});
```

### 2. Standard Modular Setup (`createApp` + `startServer`)

```typescript
import type { Express } from 'express';
import type { Server } from 'node:http';
import { createApp, startServer } from 'wnodex';
import { myRouter } from './routes.js';

export const app: Express = createApp({
  serviceName: 'Accounts Service',
  enableCompression: true,
  enableCookieParser: true,
  routes: myRouter,
});

export const server: Server = startServer(app, {
  serviceName: 'Accounts Service',
  cleanupHooks: [
    async () => {
      // Disconnect database, redis, etc.
    },
  ],
});
```

### 3. Object-Oriented Class Setup (`Wnodex`)

```typescript
import { Wnodex } from 'wnodex';

const server = new Wnodex({
  port: 3000,
  serviceName: 'Accounts Service',
  helmet: true,
  cors: {
    origin: 'https://my-app.com',
  },
  compression: true,
  cookieParser: {
    secret: 'my-cookie-secret',
  },
  session: {
    secret: 'my-session-secret',
  },
  passport: true,
  hpp: ['sort', 'filter'],
});

const app = server.getApp();

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from wnodex!' });
});

await server.start();
```

---

## Modular Subpath Imports

All features are exported from the root `wnodex` entry point and also organized into focused subpath modules:

```typescript
import { loadConfig } from 'wnodex/config';
import { HttpError, ValidationError } from 'wnodex/errors';
import { createDatabaseHealthPlugin, createHealthRouter } from 'wnodex/health';
import { createLogger } from 'wnodex/logger';
import {
  configurePassport,
  createCompressionMiddleware,
  createCookieParserMiddleware,
  createCorsMiddleware,
  createHelmetMiddleware,
  createHppMiddleware,
  createRateLimiter,
  createSessionMiddleware,
  registerStaticAssets,
} from 'wnodex/middlewares';
import { setupGracefulShutdown } from 'wnodex/server';
```

---

## Configuration

The package automatically loads configuration from environment variables or custom overrides:

| Variable               | Default                       | Description                                               |
| ---------------------- | ----------------------------- | --------------------------------------------------------- |
| `PORT`                 | `3000`                        | Port the server listens on                                |
| `HOST`                 | `localhost`                   | Host address                                              |
| `NODE_ENV`             | `development`                 | Runtime environment (`development`, `production`, `test`) |
| `LOG_LEVEL`            | `debug` (dev) / `info` (prod) | Pino log level                                            |
| `SHUTDOWN_TIMEOUT_MS`  | `10000`                       | Milliseconds before forcing exit during graceful shutdown |
| `BODY_LIMIT`           | `1mb`                         | Max request body size limit                               |
| `CORS_ORIGIN`          | `*`                           | Allowed CORS origins (comma-separated or `*`)             |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15m)                | Window time for rate limiting                             |
| `RATE_LIMIT_MAX`       | `100`                         | Max requests per IP per window                            |
| `SERVICE_NAME`         | `undefined`                   | Optional service identifier                               |
| `COOKIE_SECRET`        | `undefined`                   | Optional secret used by `cookie-parser`                   |
| `SESSION_SECRET`       | `undefined`                   | Optional secret used by `express-session`                 |

You can override any configuration directly in code:

```typescript
import { createApp, loadConfig } from 'wnodex';

const customConfig = loadConfig({
  port: 8080,
  bodyLimit: '10mb',
  corsOrigin: ['https://example.com'],
});

const app = createApp({ config: customConfig });
```

---

## Customizing Endpoints & Middlewares

### Error Handling

Throw `HttpError` anywhere in your routes or middleware:

```typescript
import { HttpError } from 'wnodex';

app.get('/users/:id', (req, res) => {
  const user = findUser(req.params.id);
  if (!user) {
    throw new HttpError(404, 'User not found');
    // Or use static factory methods:
    // throw HttpError.notFound('User not found');
  }
  res.json(user);
});
```

### Custom Application Settings (`app.set` & `app.get`)

Inject custom application settings via `settings` (or pass `serviceName` directly) and retrieve them with `app.get(name)` or `req.app.get(name)`:

```typescript
import { createApp } from 'wnodex';

const app = createApp({
  serviceName: 'accounts-api',
  settings: {
    apiVersion: 'v1',
    customFlag: true,
  },
  routes: (app) => {
    app.get('/info', (req, res) => {
      res.json({
        service: req.app.get('serviceName'),
        version: req.app.get('apiVersion'),
      });
    });
  },
});
```

### Health Checks & Extensible Plugins

Health check endpoints (`/health`, `/health/live`, `/health/ready`) are mounted automatically. You can extend them with custom indicators (such as database ping or cache checks) or disable them completely:

#### 1. Extending with Custom Plugins (e.g. Database Ping)

```typescript
import { createApp, createDatabaseHealthPlugin } from 'wnodex';

const app = createApp({
  serviceName: 'Accounts Service',
  healthOptions: {
    plugins: [
      createDatabaseHealthPlugin(
        async () => {
          return await db.ping();
        },
        { critical: true }
      ),
    ],
  },
});
```

#### 2. Disabling the Health Check Endpoints

```typescript
import { createApp } from 'wnodex';

const app = createApp({
  enableHealthCheck: false, // Disables /health, /health/live, /health/ready
});
```

---

## License

MIT © Davide Di Criscito
