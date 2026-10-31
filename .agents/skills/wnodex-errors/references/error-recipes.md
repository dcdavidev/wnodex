# Error Handling Recipes

Copy-ready patterns for working with `wnodex/errors` and customizing error middlewares.

## 1. Async Route Wrapper for Express 4

Intent: automatically forward rejected promises from `async` route handlers and middlewares to `next(err)` so the centralized `errorHandler` catches them.

```typescript
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createApp, HttpError } from 'wnodex';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const app = createApp({ serviceName: 'orders-api' });

app.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await findOrderById(req.params.id);
    if (!order) {
      throw HttpError.notFound(`Order ${req.params.id} not found`, {
        context: { orderId: req.params.id },
      });
    }
    res.json(order);
  })
);
```

## 2. Custom `BaseError` Subclass with Domain Error Codes

Intent: create domain-specific errors that preserve cause chains, attach structured `context`, and serialize via `toJSON()`.

```typescript
import { BaseError, type ErrorMetadata } from 'wnodex/errors';

export class PaymentError extends BaseError {
  public readonly statusCode = 402;

  constructor(
    message: string,
    metadata?: Omit<ErrorMetadata, 'code'> & { code?: string }
  ) {
    super(message, {
      code: metadata?.code ?? 'PAYMENT_REQUIRED',
      cause: metadata?.cause,
      context: metadata?.context,
    });
  }
}

// Usage:
throw new PaymentError('Card was declined by issuer', {
  code: 'CARD_DECLINED',
  cause: gatewayError,
  context: { customerId: 'cus_123', attempt: 2 },
});
```

Notes: defining `public readonly statusCode = 402` on the subclass allows `wnodex`'s default `createErrorHandler` to automatically respond with HTTP 402 without needing a custom error handler.

## 3. Mapping `ValidationError` to HTTP 422 in a Custom Error Handler

Intent: extend the default error handler so `ValidationError` responds with 422 and exposes `code` and `context` to API clients.

```typescript
import type { ErrorRequestHandler } from 'express';
import {
  BaseError,
  createApp,
  createErrorHandler,
  ValidationError,
} from 'wnodex';

const fallbackErrorHandler = createErrorHandler();

export const domainErrorHandler: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  next
) => {
  if (err instanceof ValidationError) {
    res.status(422).json({
      status: 422,
      error: err.name,
      code: err.code,
      message: err.message,
      ...(err.context !== undefined && { details: err.context }),
    });
    return;
  }

  if (err instanceof BaseError && 'statusCode' in err) {
    const status = Number(err.statusCode) || 500;
    res.status(status).json({
      status,
      error: err.name,
      code: err.code,
      message: err.message,
      ...(err.context !== undefined && { context: err.context }),
    });
    return;
  }

  fallbackErrorHandler(err, req, res, next);
};

export const app = createApp({
  serviceName: 'catalog-api',
  errorHandler: domainErrorHandler,
});
```

## 4. Customizing the 404 Not Found Response

Intent: customize the 404 message using `createNotFoundHandler` or a custom handler.

```typescript
import { createApp, createNotFoundHandler } from 'wnodex';

export const app = createApp({
  serviceName: 'public-api',
  notFoundHandler: createNotFoundHandler(
    (req) => `Endpoint ${req.method} ${req.originalUrl} does not exist`
  ),
});
```

## 5. Testing Error Responses and `toJSON()` Serialization

Intent: verify both unit serialization of `BaseError` and HTTP responses from `createErrorHandler`.

```typescript
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, createLogger, HttpError, loadConfig } from 'wnodex';

describe('error handling', () => {
  it('masks 500 error details in production while preserving 4xx messages', async () => {
    const app = createApp({
      config: loadConfig({
        nodeEnv: 'production',
        isProduction: true,
        isDevelopment: false,
      }),
      logger: createLogger({ level: 'silent' }),
      routes: (router) => {
        router.get('/missing', () => {
          throw HttpError.notFound('Item 99 not found');
        });
        router.get('/crash', () => {
          throw new Error('Database credentials leaked in error');
        });
      },
    });

    const notFoundRes = await supertest(app).get('/missing');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body).toEqual({
      status: 404,
      error: 'HttpError',
      message: 'Item 99 not found',
    });

    const crashRes = await supertest(app).get('/crash');
    expect(crashRes.status).toBe(500);
    expect(crashRes.body).toEqual({
      status: 500,
      error: 'Error',
      message: 'An internal server error occurred.',
    });
    expect(crashRes.body.stack).toBeUndefined();
  });
});
```
