---
name: wnodex-errors
description: This skill should be used when the user asks to "handle errors in wnodex", "throw an HTTP error in wnodex", "create a custom error in wnodex", "customize 404 or 500 responses in wnodex", "use ValidationError or ConfigError", or mentions wnodex/errors, BaseError, HttpError, ConfigError, ValidationError, ERROR_CODES, ErrorCode, ErrorMetadata, createErrorHandler, or createNotFoundHandler. Covers the error class hierarchy, static factories, JSON serialization, centralized error handling, and 404 fallbacks.
---

# wnodex Errors & Error Handling

## Purpose

`wnodex/errors` (and the companion error middlewares in `wnodex/middlewares`) provide a structured error hierarchy rooted at `BaseError`, plus centralized Express 404 and error-handling middlewares. Every error carries a machine-readable `code`, optional `cause` and `context`, and deterministic `toJSON()` serialization for structured Pino logs.

Use this skill to throw HTTP or domain errors, define custom `BaseError` subclasses, or customize 404 and global error responses.

## When to Use

Activate this skill when throwing errors in routes or middlewares, mapping domain or validation failures to HTTP responses, inspecting or serializing errors in logs, or customizing `notFoundHandler` and `errorHandler` on a `wnodex` app.

## Subpath Imports

```typescript
import {
  BaseError,
  ConfigError,
  ERROR_CODES,
  type ErrorCode,
  type ErrorMetadata,
  HttpError,
  ValidationError,
} from 'wnodex/errors';
import {
  createErrorHandler,
  createNotFoundHandler,
  errorHandler,
  type ErrorHandlerOptions,
  notFoundHandler,
} from 'wnodex/middlewares';
```

All symbols are also re-exported from the root `wnodex` package, and `wnodex/middlewares` re-exports all error classes and types from `wnodex/errors`.

## Error Hierarchy

```text
Error (native)
  └── BaseError (code, cause, context, toJSON())
        ├── HttpError (statusCode + static status factories)
        ├── ConfigError (code = 'CONFIG_ERROR')
        └── ValidationError (code = 'VALIDATION_ERROR')
```

### `BaseError`

```typescript
interface ErrorMetadata {
  code?: ErrorCode;
  cause?: unknown;
  context?: Record<string, unknown>;
}

class BaseError extends Error {
  readonly code: ErrorCode;
  override readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
  constructor(message: string, metadata?: ErrorMetadata);
  toJSON(): Record<string, unknown>;
}
```

- Sets `this.name = new.target.name` and restores the prototype chain via `Object.setPrototypeOf(this, new.target.prototype)` so `instanceof` checks always work across subclasses.
- Defaults `code` to `ERROR_CODES.INTERNAL_ERROR` (`'INTERNAL_ERROR'`).
- Passes `{ cause: metadata.cause }` to the native `Error` constructor when `cause` is present.
- `toJSON()` returns `{ name, message, code, cause?, context?, stack? }`. When `cause` is an `Error` instance, it normalizes `cause` to `{ name, message, stack }`; primitive or plain-object causes are preserved as-is.

### `ERROR_CODES` and `ErrorCode`

```typescript
const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | (string & {});
```

Because `ErrorCode` is widened with `(string & {})`, TypeScript autocomplete suggests the 9 built-in constants while still allowing custom string codes such as `'PAYMENT_DECLINED'`.

## `HttpError`

`HttpError` adds a numerical `statusCode` property and automatically maps the status code to a default `ErrorCode` when `metadata.code` is omitted:

| Status Code | Default `code`                  | Static Factory                                   | Default Message           |
| :---------- | :------------------------------ | :----------------------------------------------- | :------------------------ |
| `400`       | `ERROR_CODES.BAD_REQUEST`       | `HttpError.badRequest(message?, metadata?)`      | `'Bad Request'`           |
| `401`       | `ERROR_CODES.UNAUTHORIZED`      | `HttpError.unauthorized(message?, metadata?)`    | `'Unauthorized'`          |
| `403`       | `ERROR_CODES.FORBIDDEN`         | `HttpError.forbidden(message?, metadata?)`       | `'Forbidden'`             |
| `404`       | `ERROR_CODES.NOT_FOUND`         | `HttpError.notFound(message?, metadata?)`        | `'Not Found'`             |
| `409`       | `ERROR_CODES.CONFLICT`          | `HttpError.conflict(message?, metadata?)`        | `'Conflict'`              |
| `422`       | `ERROR_CODES.VALIDATION_ERROR`  | `new HttpError(422, message, metadata)`          | —                         |
| `429`       | `ERROR_CODES.TOO_MANY_REQUESTS` | `HttpError.tooManyRequests(message?, metadata?)` | `'Too Many Requests'`     |
| `500` / any | `ERROR_CODES.INTERNAL_ERROR`    | `HttpError.internal(message?, metadata?)`        | `'Internal Server Error'` |

### Constructor Overloads

`HttpError` supports two constructor signatures for compatibility:

1. **Status-first (recommended)**: `new HttpError(statusCode: number, message: string, metadata?: ErrorMetadata)`
2. **Message-first (legacy)**: `new HttpError(message: string, statusCode?: number, metadata?: ErrorMetadata)` (defaults `statusCode` to `500`)

```typescript
import { HttpError } from 'wnodex/errors';

// Static factory (preferred for standard statuses)
throw HttpError.notFound('Invoice not found', {
  context: { invoiceId: req.params.id },
});

// Status-first constructor (preferred for arbitrary status codes like 422 or 503)
throw new HttpError(422, 'Unprocessable Entity', {
  context: { field: 'amount' },
});
```

## `ConfigError` and `ValidationError`

Both extend `BaseError` with a positional `(message, cause?, context?)` constructor:

```typescript
new ConfigError(message: string, cause?: unknown, context?: Record<string, unknown>);
// -> name: 'ConfigError', code: 'CONFIG_ERROR'

new ValidationError(message: string, cause?: unknown, context?: Record<string, unknown>);
// -> name: 'ValidationError', code: 'VALIDATION_ERROR'
```

Important: `ConfigError` and `ValidationError` do **not** define a `statusCode` property. If thrown inside an Express route without being caught or mapped, the default `errorHandler` treats them as status `500` (`statusCode` defaults to `500` when `'statusCode' in err` is false). For HTTP 400/422 responses, either throw `HttpError.badRequest` / `new HttpError(422, ...)` or wrap/map `ValidationError` in a custom error handler.

## Centralized Error & 404 Middlewares

`createApp` mounts the 404 handler after all routes (including the post-creation dynamic router) and the error handler last.

### 404 Not Found Handler (`createNotFoundHandler`)

```typescript
createNotFoundHandler(customMessage?: string | ((req: Request) => string)): RequestHandler
```

Default response (`404`):

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Cannot GET /missing-path"
}
```

### Global Error Handler (`createErrorHandler`)

```typescript
interface ErrorHandlerOptions {
  isDevelopment?: boolean;
  isProduction?: boolean;
  logger?: Logger;
}

createErrorHandler(options?: ErrorHandlerOptions): ErrorRequestHandler
```

Behaviour when an error reaches the handler:

1. Resolves `statusCode` from `err.statusCode` if it is a number, otherwise `500`.
2. Logs via `activeLogger.error({ err, method: req.method, url: req.originalUrl, statusCode }, 'Unhandled error caught during request processing: ...')`.
3. Returns immediately without writing if `res.headersSent` is true.
4. Responds with JSON:
   - `status`: `statusCode`
   - `error`: `err.name || 'InternalServerError'`
   - `message`: `'An internal server error occurred.'` when `statusCode === 500 && isProduction`, otherwise `err.message`
   - `stack`: included **only** when `isDevelopment` is true.

## Express 4 Async Error Caveat

`wnodex` runs on Express 4 (`^4.21.0`). Synchronous throws inside route handlers are caught automatically by Express, but **rejected promises in `async` handlers must be forwarded with `next(err)`** (or wrapped in an async handler utility) so Express routes them to `errorHandler`.

```typescript
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await fetchUser(req.params.id);
    if (!user) throw HttpError.notFound('User not found');
    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

## Verification Checklist

1. Confirm `HttpError` (or an error with a numeric `statusCode`) is used for non-500 HTTP responses under the default `errorHandler`.
2. Confirm `async` Express 4 route handlers pass rejected promises to `next(err)`.
3. Confirm production mode (`NODE_ENV=production`) masks 500 error messages and omits `stack`.
4. Confirm custom subclasses of `BaseError` pass `metadata` to `super(message, metadata)`.

## Additional Resources

### Reference Files

- **`references/error-recipes.md`** — recipes for async route error wrappers, mapping `ValidationError` (or Zod/schema errors) to 422 responses, subclassing `BaseError` with custom `ErrorCode`s, and custom `notFoundHandler` / `errorHandler` setups.

### Related Skills

- **`wnodex`** — core API, application setup, and overview.
- **`wnodex-config`** — `ServerConfig` (`isDevelopment`, `isProduction`) and `ConfigError` triggers.
- **`wnodex-logger`** — how `err` objects are serialized by Pino in `errorHandler`.
- **`wnodex-middlewares`** — middleware mount order and where `notFoundHandler` / `errorHandler` sit.
- **`wnodex-development`** — repository architecture and testing conventions.
