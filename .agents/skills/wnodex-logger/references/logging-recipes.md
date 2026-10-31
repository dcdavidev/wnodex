# Logging Recipes

Copy-ready patterns for structured Pino logging with `wnodex/logger`.

## 1. Request-Scoped Child Logger Middleware

Intent: attach a Pino child logger bound with `requestId`, `method`, and `path` to every incoming request so downstream logs correlate automatically.

```typescript
import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { createApp, createLogger } from 'wnodex';

declare global {
  namespace Express {
    interface Request {
      log: Logger;
    }
  }
}

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const baseLogger = req.app.get('logger') as Logger;
  const requestId =
    (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

  res.setHeader('x-request-id', requestId);
  req.log = baseLogger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
  });

  req.log.debug('Incoming request');
  next();
};

export const app = createApp({
  serviceName: 'orders-api',
  logger: createLogger(),
  configure: (expressApp) => {
    expressApp.use(requestLoggerMiddleware);
  },
});
```

## 2. Extending Redaction While Preserving Default Redacted Paths

Intent: redact domain-specific secrets (API keys, SSNs, tokens in nested payloads) without losing `DEFAULT_REDACTED_PATHS`.

```typescript
import { createLogger, DEFAULT_REDACTED_PATHS } from 'wnodex';

export const logger = createLogger({
  redact: {
    paths: [
      ...DEFAULT_REDACTED_PATHS,
      'req.headers["x-api-key"]',
      'body.creditCard.number',
      'body.creditCard.cvv',
      '*.secretKey',
    ],
    censor: '[REDACTED]',
  },
});
```

## 3. Adding Base Bindings (`service`, `version`, `region`)

Intent: include static metadata on every JSON log line emitted in production.

```typescript
import { createLogger, loadConfig } from 'wnodex';

const cfg = loadConfig();

export const logger = createLogger({
  level: cfg.logLevel,
  isDevelopment: cfg.isDevelopment,
  isTest: cfg.isTest,
  base: {
    service: cfg.serviceName ?? 'billing-api',
    env: cfg.nodeEnv,
  },
});
```

## 4. Silent Logger and Spy Assertions in Vitest

Intent: keep test output clean while asserting that specific warning or error logs were emitted.

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createLogger, LOG_LEVELS, Wnodex } from 'wnodex';

describe('lifecycle logging', () => {
  it('logs a warning when shutdown is called before start', async () => {
    const silentLogger = createLogger({ level: LOG_LEVELS.SILENT });
    const warnSpy = vi.spyOn(silentLogger, 'warn');

    const server = new Wnodex({
      port: 0,
      logger: silentLogger,
    });

    await server.shutdown();
    expect(warnSpy).toHaveBeenCalledWith('Server not running.');
  });
});
```
