# Middleware Recipes

Copy-ready wnodex middleware combinations. Each recipe lists the intent, the configuration, and the reason for the choices.

## 1. Public JSON API Service

Intent: a stateless API behind a load balancer, no sessions.

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'accounts-api',
  trustProxy: 1, // behind one reverse proxy
  enableHelmet: true,
  corsOptions: { origin: ['https://app.example.com'] },
  enableCompression: true, // opt-in; compresses JSON
  bodyLimit: '1mb',
  enableRateLimit: true,
  rateLimitOptions: { windowMs: 60_000, limit: 300 },
  enableHealthCheck: true,
});
```

Notes: `trustProxy: 1` is required for the rate limiter to read the real client IP from `X-Forwarded-For`. Credentials stay off, so an origin list is still preferred over `*`.

## 2. Session-Based Authentication

Intent: cookie sessions backed by Passport with local or OAuth strategies.

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'admin-portal',
  enableCookieParser: true,
  cookieParserOptions: { secret: process.env.COOKIE_SECRET! },
  enableSession: true,
  sessionOptions: {
    secret: process.env.SESSION_SECRET!,
    cookie: { secure: true, sameSite: 'lax', maxAge: 3_600_000 },
  },
  enablePassport: true, // mounts passport.initialize() and passport.session()
  corsOptions: { origin: ['https://admin.example.com'], credentials: true },
});
```

Notes: `enablePassport: true` already mounts both Passport handlers, so do not also call `configurePassport(app)` — that would mount them twice. Call `configurePassport(app)` only when you build the app without `enablePassport` and mount Passport yourself. Cookie parser must precede the session middleware so signed cookies are available. Set `cookie.secure: true` only when serving over HTTPS. Replace the in-memory session store before running multiple instances.

## 3. Single-Page App Host

Intent: serve a built frontend with immutable assets plus API routes.

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'web-app',
  enableCompression: true,
  staticOptions: {
    clientRoot: '/var/www/web-app',
    staticSubdir: 'assets',
    staticUrlPrefix: '/assets',
    immutableMaxAge: '1y',
    rootMaxAge: '10m',
  },
  routes: (app) => {
    app.get('/api/config', (_req, res) => res.json({ featureFlags: {} }));
  },
});
```

Notes: `staticOptions` mounts before `routes` in the internal order, but the immutable mount does not fall through, so `/assets/*` misses stay 404. Keep `rootMaxAge` short for `index.html` so deploys are picked up.

## 4. Hardening a Public Endpoint

Intent: add stricter limits to a sensitive route while keeping global defaults.

```typescript
import express from 'express';
import { createApp, createRateLimiter } from 'wnodex';

const loginLimiter = createRateLimiter({ windowMs: 900_000, limit: 5 });

export const app = createApp({ serviceName: 'auth-api' });

app.post('/auth/login', loginLimiter, (req, res) => {
  // The global limiter still applies; this adds a second, tighter budget.
  res.json({ ok: true });
});
```

Notes: `createRateLimiter` returns a standard Express handler, so it composes as per-route middleware. Both the global limiter and the route limiter count the request.

## 5. Trusting Custom Proxies

Intent: read correct client IPs and protocol behind a CDN or multiple proxies.

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'edge-api',
  trustProxy: ['10.0.0.0/8', '192.168.0.0/16'], // explicit trusted hops
});
```

Notes: the default is `trustProxy: 1`. Prefer explicit CIDR ranges over `true`, which trusts any upstream and lets clients spoof `X-Forwarded-For`.

## 6. Disabling a Default Middleware

Intent: opt out of a default for a specific environment or test.

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'internal-tool',
  enableRateLimit: false, // tests only; keep enabled in production
  enableHealthCheck: false, // no health endpoints on this app
});
```

Notes: `enableX: false` overrides both the default and any `XOptions` object. Only disable security middleware with a clear reason.

## Ordering Cheat Sheet

When mounting middleware manually (for example in tests using bare `express`), preserve this relative order:

1. Helmet, then CORS.
2. Compression.
3. Body parser, then cookie parser.
4. HPP.
5. Rate limiter.
6. Session.
7. Passport initialize and session.
8. Health router.
9. Static assets.
10. Application routes.
11. 404 fallback.
12. Error handler last.

The error handler must be last because Express only routes errors to handlers registered after the throwing layer.
