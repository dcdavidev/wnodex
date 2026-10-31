---
name: wnodex-middlewares
description: This skill should be used when the user asks to "add a middleware in wnodex", "configure CORS in wnodex", "enable Helmet", "set up rate limiting", "add session or Passport authentication", "serve static assets in wnodex", "enable compression", "configure the body parser", "parse cookies", "protect against parameter pollution", or mentions wnodex middleware factories such as createCorsMiddleware, createHelmetMiddleware, createRateLimiter, createSessionMiddleware, configurePassport, registerStaticAssets, or the default middleware instances. Covers the full middleware ecosystem, defaults, ordering, and recipes.
---

# wnodex Middlewares

## Purpose

`wnodex` ships a curated middleware ecosystem. Each middleware has a factory that returns a configured handler, plus a pre-built default instance. Understanding the defaults and the fixed mount order prevents both security gaps and ordering bugs.

Use this skill to add, configure, or disable middlewares, and to author new ones that fit the wnodex conventions.

## When to Use

Activate this skill when adding or configuring security headers, CORS, compression, body/cookie parsing, parameter-pollution protection, rate limiting, sessions, authentication, or static file serving on a wnodex app.

## The Two Ways to Configure Middleware

Both APIs converge on the same middleware factories, so behaviour is identical.

```typescript
// 1. Functional: explicit enable/options pairs
import { createApp } from 'wnodex';

const app = createApp({
  enableCompression: true,
  compressionOptions: { threshold: 1024 },
  enableCookieParser: true,
  cookieParserOptions: { secret: 'cookie-secret' },
});

// 2. Class: shorthand toggle accepts a boolean OR an options object
import { Wnodex } from 'wnodex';

const server = new Wnodex({
  compression: { threshold: 1024 }, // object => enabled AND configured
  cookieParser: { secret: 'cookie-secret' },
});
```

For the class API, providing an options object enables the middleware. `enableX: false` always wins over an options object.

## Defaults and Mount Order

Middleware mounts in a fixed order. The order is deliberate: security headers first, then parsing, then protection, then stateful middleware, then routes.

| #   | Middleware    | Default | Factory                                                                             | Default instance                                                  |
| :-- | :------------ | :------ | :---------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| 1   | Helmet        | on      | `createHelmetMiddleware`                                                            | `helmetMiddleware`                                                |
| 2   | CORS          | on      | `createCorsMiddleware`, `createCorsOptions`                                         | `corsMiddleware`, `corsOptions`                                   |
| 3   | Compression   | off     | `createCompressionMiddleware`                                                       | `compressionMiddleware`                                           |
| 4   | Body parser   | on      | `createBodyParserMiddlewares`, `createJsonBodyParser`, `createUrlencodedBodyParser` | `bodyParserMiddlewares`, `jsonBodyParser`, `urlencodedBodyParser` |
| 5   | Cookie parser | off     | `createCookieParserMiddleware`                                                      | `cookieParserMiddleware`                                          |
| 6   | HPP           | on      | `createHppMiddleware`                                                               | `hppMiddleware`                                                   |
| 7   | Rate limit    | on      | `createRateLimiter`                                                                 | `rateLimiter`                                                     |
| 8   | Session       | off     | `createSessionMiddleware`, `createSessionOptions`                                   | —                                                                 |
| 9   | Passport      | off     | `configurePassport`, `createPassportMiddlewares`                                    | —                                                                 |
| 10  | Health        | on      | `createHealthRouter`                                                                | `healthRouter`                                                    |
| 11  | Static        | off     | `registerStaticAssets`                                                              | `StaticAssets.register`                                           |

Compression sits before the body parser, so responses compress regardless of request parsing. Rate limiting sits after parsing but before sessions, so abusive requests are rejected before session stores are touched.

## Security Middleware

### Helmet

```typescript
import { createHelmetMiddleware } from 'wnodex';

app.use(createHelmetMiddleware({ contentSecurityPolicy: false }));
```

Passes options straight to `helmet`. Disable the whole middleware with `enableHelmet: false`.

### CORS

`createCorsOptions(customOptions?)` builds options from `config.corsOrigin` plus defaults: `credentials: true`, methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, and allowed headers `Content-Type, Authorization, X-Requested-With, Accept, X-Request-Id`. Your `customOptions` spread last and override each default.

```typescript
import { createCorsMiddleware, createCorsOptions } from 'wnodex';

const opts = createCorsOptions({ origin: 'https://allowed.example.com' });
app.use(createCorsMiddleware(opts));
```

`config.corsOrigin` accepts `*`, a single origin, or a comma-separated list parsed into an array. Note the defaults use `credentials: true`; pairing that with `origin: '*'` is invalid per the CORS spec, so set an explicit origin list in production.

### HPP

`createHppMiddleware(options?)` protects against HTTP parameter pollution. An array argument is normalized to `{ whitelist: [...] }`, which keeps array-valued parameters for the listed keys.

```typescript
import { createHppMiddleware } from 'wnodex';

// Keep ?tags=a&tags=b as an array; collapse every other duplicate to the last value
app.use(createHppMiddleware(['tags']));
```

## Request Parsing

### Body parser

```typescript
interface BodyParserOptions {
  limit?: string | number;
  extended?: boolean; // urlencoded, default true
  json?: JsonBodyParserOptions; // forwarded to express.json()
  urlencoded?: UrlencodedBodyParserOptions;
}
```

`createBodyParserMiddlewares(input?)` returns `[json, urlencoded]`. `input` may be a limit string or a `BodyParserOptions` object. The limit resolves in this order: `bodyParserOptions.limit`, then `options.bodyLimit`, then `config.bodyLimit`.

```typescript
import { createBodyParserMiddlewares } from 'wnodex';

for (const mw of createBodyParserMiddlewares({
  limit: '5mb',
  extended: false,
})) {
  app.use(mw);
}
```

### Cookie parser

`createCookieParserMiddleware(input?)` accepts four shapes:

- a string or `string[]` secret,
- `{ secret, options }`,
- a raw `CookieParseOptions` object,
- nothing, which falls back to `config.cookieSecret`.

```typescript
import { createCookieParserMiddleware } from 'wnodex';

app.use(createCookieParserMiddleware({ secret: ['new-secret', 'old-secret'] }));
```

## Rate Limiting

```typescript
import { createRateLimiter } from 'wnodex';

app.use(createRateLimiter({ windowMs: 60_000, limit: 20 }));
```

Defaults come from `config.rateLimitWindowMs` (900000) and `config.rateLimitMax` (100), overridden by any `customOptions`. The limiter uses `standardHeaders: 'draft-8'` and disables legacy headers. On exceed it responds 429 with:

```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

Because the middleware runs before sessions and authentication, tune `windowMs`/`limit` per environment rather than disabling it. The type alias `RateLimitOptions` is re-exported from `express-rate-limit`.

## Sessions

`createSessionOptions(customOptions?)` builds secure defaults and throws `ConfigError` when no secret is resolvable.

| Option              | Default                                            |
| :------------------ | :------------------------------------------------- |
| `resave`            | `false`                                            |
| `saveUninitialized` | `false`                                            |
| `cookie.httpOnly`   | `true`                                             |
| `cookie.maxAge`     | `86400000` (24h)                                   |
| `cookie.secure`     | `true` in production, else `false`                 |
| `secret`            | `customOptions.secret` then `config.sessionSecret` |

`SessionMiddlewareOptions` extends `express-session`'s `SessionOptions` minus `secret`, adding `secret` and `isProduction`.

```typescript
import { createSessionMiddleware } from 'wnodex';

app.use(
  createSessionMiddleware({ secret: 'session-secret', isProduction: true })
);
```

The secret check rejects `undefined`, empty strings, whitespace-only strings, and empty arrays. Provide the secret through options or `SESSION_SECRET`.

The default store is `express-session`'s in-memory store, which is not suitable for multi-instance deployments. Supply a production store through `sessionOptions.store` when scaling horizontally.

## Passport Authentication

`configurePassport(app, options?)` sets `app.set('passport', instance)` and mounts `passport.initialize()` plus `passport.session()`. `options` may be a boolean, a `PassportStatic` instance, or `PassportMiddlewareOptions`.

```typescript
import { configurePassport } from 'wnodex';

configurePassport(app, { instance: passport, session: true });
```

`createPassportMiddlewares(options?)` returns the handlers without mounting them, for cases where mount order must be controlled manually. `resolvePassportConfig` detects a raw Passport instance by the presence of an `authenticate` method and, in that case, defaults to using sessions.

Passport requires sessions when `session` is true, so enable session middleware first.

## Static Assets

`registerStaticAssets(app, optionsOrClientRoot)` serves two mounts: the `static` subdirectory at `/static` with `immutable: true` and a `1y` max-age, then the client root with a `1h` max-age.

```typescript
import { registerStaticAssets, StaticAssets } from 'wnodex';

registerStaticAssets(app, {
  clientRoot: '/var/www/app',
  staticUrlPrefix: '/assets',
});
// Equivalent namespace form:
StaticAssets.register(app, '/var/www/app');
```

| Option            | Default   |
| :---------------- | :-------- |
| `clientRoot`      | required  |
| `staticSubdir`    | `static`  |
| `staticUrlPrefix` | `/static` |
| `immutableMaxAge` | `1y`      |
| `rootMaxAge`      | `1h`      |

The immutable mount uses `fallthrough: false`, so a missing file under the prefix returns a 404 rather than falling through to later routes.

## Adding a Custom Middleware

Follow the factory plus default-instance convention so the middleware composes with the framework.

```typescript
import crypto from 'node:crypto';

import type { RequestHandler } from 'express';

import { config } from 'wnodex/config';

export function createRequestIdMiddleware(
  header = 'x-request-id'
): RequestHandler {
  return (req, res, next) => {
    const id =
      (req.headers[header] as string | undefined) ??
      `${config.serviceName ?? 'app'}-${crypto.randomUUID()}`;
    res.setHeader(header, id);
    next();
  };
}

export const requestIdMiddleware: RequestHandler = createRequestIdMiddleware();
```

Mount custom middleware through the `configure` callback, which runs after the built-in stack and after `routes`:

```typescript
const app = createApp({
  configure: (app) => {
    app.use(requestIdMiddleware);
  },
});
```

Import `config` from `wnodex/config` and read defaults from `wnodex/constants` rather than hardcoding values, so the middleware honours the same configuration as the rest of the framework.

## Verification Checklist

After changing the middleware stack:

1. Confirm compression, cookie parser, session, and Passport are only on when intended — they are opt-in.
2. Confirm rate limiting stays enabled outside local development.
3. Confirm a session secret is supplied whenever session middleware is enabled; otherwise `createSessionOptions` throws `ConfigError`.
4. Confirm the CORS origin is explicit (not `*`) when credentials are enabled.
5. Confirm static mounts do not shadow API routes; the immutable mount does not fall through.

## Additional Resources

### Reference Files

- **`references/middleware-recipes.md`** — copy-ready recipes for common combinations: API service, session-based auth, SPA host, and hardening a public endpoint.

### Related Skills

- **`wnodex`** — core API, configuration, lifecycle, and error handling.
- **`wnodex-config`** — `ServerConfig` and `DEFAULT_*` constants consumed by middlewares.
- **`wnodex-errors`** — `HttpError`, `ConfigError`, `createErrorHandler`, and `createNotFoundHandler`.
- **`wnodex-logger`** — structured Pino logging and request-scoped child loggers.
- **`wnodex-health-checks`** — health endpoints and plugins.
- **`wnodex-server`** — server startup and graceful shutdown.
- **`wnodex-development`** — repository architecture, conventions, and release workflow.
