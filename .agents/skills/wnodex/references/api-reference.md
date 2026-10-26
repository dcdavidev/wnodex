# wnodex API Reference

Exhaustive reference for the public exports of the `wnodex` package. Load this file when exact option names, defaults, or signatures are required.

## Package Surface

| Subpath              | Purpose                                                                   |
| :------------------- | :------------------------------------------------------------------------ |
| `wnodex`             | Everything, re-exported from all modules                                  |
| `wnodex/config`      | `loadConfig`, `config`, `ServerConfig`, env parsers                       |
| `wnodex/constants`   | `DEFAULT_*` values, `LOG_LEVELS`, `DEFAULT_REDACTED_PATHS`                |
| `wnodex/errors`      | `BaseError`, `HttpError`, `ConfigError`, `ValidationError`, `ERROR_CODES` |
| `wnodex/health`      | `HealthModel`, `createHealthRouter`, plugin factories, metrics            |
| `wnodex/logger`      | `createLogger`, `logger`, `CreateLoggerOptions`                           |
| `wnodex/middlewares` | Every middleware factory and default instance                             |
| `wnodex/server`      | `setupGracefulShutdown`, `closeServerGracefully`, `CleanupHook`           |

`wnodex/index.ts` re-exports `app`, `config/index`, `constants/index`, `errors/index`, `health/index`, `logger/index`, `middlewares/index`, `server`, `server/index`, and `wnodex`.

## `createApp(options?): Express`

Creates a configured Express application. Middleware mounts in this fixed order: settings and trust proxy, `x-powered-by` disable, Helmet, CORS, compression, body parser, cookie parser, HPP, rate limit, session, Passport, health router, static assets, custom routes, `configure` callback, dynamic router, 404 fallback, error handler.

### `CreateAppOptions`

| Option                | Type                                                              | Default              | Notes                                    |
| :-------------------- | :---------------------------------------------------------------- | :------------------- | :--------------------------------------- |
| `config`              | `ServerConfig`                                                    | `config` singleton   | Active configuration                     |
| `serviceName`         | `string`                                                          | `config.serviceName` | Stored via `app.set('serviceName', ...)` |
| `logger`              | `Logger`                                                          | `logger` singleton   | Stored via `app.set('logger', ...)`      |
| `settings`            | `Record<string, unknown>`                                         | —                    | Each entry applied with `app.set`        |
| `trustProxy`          | `boolean \| number \| string`                                     | `1`                  | Sets Express `trust proxy`               |
| `disableXPoweredBy`   | `boolean`                                                         | `true`               | `false` keeps the header                 |
| `enableHelmet`        | `boolean`                                                         | `true`               |                                          |
| `helmetOptions`       | `HelmetOptions`                                                   | —                    |                                          |
| `enableCors`          | `boolean`                                                         | `true`               |                                          |
| `corsOptions`         | `CorsOptions`                                                     | —                    |                                          |
| `enableCompression`   | `boolean`                                                         | `false`              | Auto-on when `compressionOptions` set    |
| `compressionOptions`  | `CompressionOptions`                                              | —                    |                                          |
| `enableBodyParser`    | `boolean`                                                         | `true`               | Mounts JSON then urlencoded              |
| `bodyLimit`           | `string`                                                          | `config.bodyLimit`   |                                          |
| `bodyParserOptions`   | `BodyParserOptions`                                               | —                    |                                          |
| `enableCookieParser`  | `boolean`                                                         | `false`              | Auto-on when `cookieParserOptions` set   |
| `cookieParserOptions` | `CookieParserOptions \| CookieParseOptions \| string \| string[]` | —                    |                                          |
| `enableHpp`           | `boolean`                                                         | `true`               |                                          |
| `hppOptions`          | `HppOptions \| string[]`                                          | —                    | Array becomes `{ whitelist }`            |
| `enableRateLimit`     | `boolean`                                                         | `true`               |                                          |
| `rateLimitOptions`    | `Partial<RateLimitOptions>`                                       | —                    |                                          |
| `enableSession`       | `boolean`                                                         | `false`              | Auto-on when `sessionOptions` set        |
| `sessionOptions`      | `SessionMiddlewareOptions`                                        | —                    | Requires a secret                        |
| `enablePassport`      | `boolean`                                                         | `false`              | Auto-on when `passportOptions` set       |
| `passportOptions`     | `PassportMiddlewareOptions \| PassportStatic`                     | —                    |                                          |
| `enableHealthCheck`   | `boolean`                                                         | `true`               |                                          |
| `healthOptions`       | `HealthCheckOptions`                                              | —                    |                                          |
| `staticOptions`       | `string \| StaticAssetsOptions`                                   | —                    | String is treated as `clientRoot`        |
| `routes`              | `Router \| RequestHandler \| (app: Express) => void`              | —                    |                                          |
| `configure`           | `(app: Express) => void`                                          | —                    | Runs after `routes`                      |
| `notFoundHandler`     | `RequestHandler`                                                  | built-in 404 JSON    |                                          |
| `errorHandler`        | `ErrorRequestHandler`                                             | built-in handler     |                                          |

The `routes` callback is invoked directly only when it declares exactly one parameter; otherwise it is mounted with `app.use`, which matters for how Express matches its path.

### Auto-enable rules

Compression, cookie parser, session, and Passport each enable themselves when their corresponding options object is provided, even without the explicit `enable*` flag. Passing `enableX: false` always wins.

## `startServer(appOrOptions?, maybeOptions?): Server`

Starts an HTTP server and attaches graceful shutdown. When the first argument has a `.listen` method it is treated as an Express app and the second argument supplies options; otherwise the first argument is the options object and the app is created internally.

### `StartServerOptions`

| Option         | Type                                          | Default                                                                    | Notes                        |
| :------------- | :-------------------------------------------- | :------------------------------------------------------------------------- | :--------------------------- |
| `config`       | `ServerConfig`                                | `config` singleton                                                         | Provides `host` and `port`   |
| `logger`       | `Logger`                                      | `app.get('logger')` then `logger`                                          |                              |
| `serviceName`  | `string`                                      | `app.get('serviceName')` then `config.serviceName` then `'Express server'` |                              |
| `timeoutMs`    | `number`                                      | `config.shutdownTimeoutMs`                                                 | Shutdown grace period        |
| `cleanupHooks` | `CleanupHook[]`                               | `[]`                                                                       | Run in order during shutdown |
| `onListening`  | `(info: { host, port, server, app }) => void` | —                                                                          | Called once listening        |

`CreateServerOptions` is the intersection of `CreateAppOptions` and `StartServerOptions`.

## `createServer(options?): ServerInstance`

Calls `createApp` then `startServer` with the same options and returns `{ app, server, logger, config }`.

## `Wnodex`

```typescript
class Wnodex {
  constructor(options?: WnodexOptions);
  getApp(): Express;
  getConfig(): ServerConfig;
  getLogger(): Logger;
  getServer(): Server | undefined;
  registerHealthPlugin(plugin: HealthPlugin): this;
  start(): Promise<Server>;
  shutdown(chores?: CleanupHook): Promise<void>;
}
```

### `WnodexOptions`

Extends `Omit<CreateServerOptions, 'config' | 'logger'>` and `Partial<ServerConfig>`, adding `config`, `logger`, and shorthand toggles. Each shorthand accepts a boolean or an options object; an object enables and configures the middleware.

| Shorthand      | Accepted type                                                                |
| :------------- | :--------------------------------------------------------------------------- |
| `helmet`       | `boolean \| HelmetOptions`                                                   |
| `cors`         | `boolean \| CorsOptions`                                                     |
| `compression`  | `boolean \| CompressionOptions`                                              |
| `bodyParsers`  | `boolean \| BodyParserOptions`                                               |
| `cookieParser` | `boolean \| CookieParserOptions \| CookieParseOptions \| string \| string[]` |
| `hpp`          | `boolean \| HppOptions \| string[]`                                          |
| `rateLimit`    | `boolean \| Partial<RateLimitOptions>`                                       |
| `session`      | `false \| SessionMiddlewareOptions`                                          |
| `passport`     | `boolean \| PassportMiddlewareOptions \| PassportStatic`                     |
| `healthCheck`  | `boolean \| HealthCheckOptions`                                              |
| `staticAssets` | `string \| StaticAssetsOptions`                                              |

Additional options: `autoSignalShutdown?: boolean` (default `false`). When true, `start()` attaches signal handlers.

`normalizeAppOptions` resolves the shorthands into explicit `enable*` and `*Options` fields before delegating to `createApp`, so both APIs behave identically.

`registerHealthPlugin` appends to the `healthPlugins` array stored on the app, replacing any plugin with the same `name`.

`shutdown(chores?)` prepends `chores` to `cleanupHooks`, then calls `closeServerGracefully`. It logs a warning and returns without error when the server is not running.

## Configuration

### `ServerConfig`

| Field               | Type                  | Source                 | Default                            |
| :------------------ | :-------------------- | :--------------------- | :--------------------------------- |
| `nodeEnv`           | `string`              | `NODE_ENV`             | `development`                      |
| `isDevelopment`     | `boolean`             | derived                | `nodeEnv === 'development'`        |
| `isProduction`      | `boolean`             | derived                | `nodeEnv === 'production'`         |
| `isTest`            | `boolean`             | derived                | `nodeEnv === 'test'`               |
| `port`              | `number`              | `PORT`                 | `3000`                             |
| `host`              | `string`              | `HOST`                 | `localhost`                        |
| `logLevel`          | `string`              | `LOG_LEVEL`            | `debug` (dev) / `info` (otherwise) |
| `shutdownTimeoutMs` | `number`              | `SHUTDOWN_TIMEOUT_MS`  | `10000`                            |
| `bodyLimit`         | `string`              | `BODY_LIMIT`           | `1mb`                              |
| `corsOrigin`        | `string \| string[]`  | `CORS_ORIGIN`          | `*`                                |
| `rateLimitWindowMs` | `number`              | `RATE_LIMIT_WINDOW_MS` | `900000`                           |
| `rateLimitMax`      | `number`              | `RATE_LIMIT_MAX`       | `100`                              |
| `serviceName`       | `string?`             | `SERVICE_NAME`         | `undefined`                        |
| `cookieSecret`      | `string \| string[]?` | `COOKIE_SECRET`        | `undefined`                        |
| `sessionSecret`     | `string \| string[]?` | `SESSION_SECRET`       | `undefined`                        |

`AppConfig` is an alias of `ServerConfig`.

### Parsers

- `parseEnvString(override, envValue, fallback)` — override wins; blank env falls back.
- `parseEnvInt(override, envValue, fallback)` — truncates; invalid or blank env falls back; `NaN` override falls back.
- `isEnvFlagEnabled(override, envValue, fallback)` — recognizes `true`/`1`/`yes` and `false`/`0`/`no` case-insensitively.
- `parseEnvOriginList(override, envValue, fallback)` — splits on commas and trims into a `string[]`, otherwise returns the raw string.

## Constants

`DEFAULT_NODE_ENV` `development`, `DEFAULT_PORT` `3000`, `DEFAULT_HOST` `localhost`, `DEFAULT_SERVICE_NAME` `Express server`, `DEFAULT_SHUTDOWN_TIMEOUT_MS` `10000`, `DEFAULT_BODY_LIMIT` `1mb`, `DEFAULT_CORS_ORIGIN` `*`, `DEFAULT_CORS_METHODS`, `DEFAULT_CORS_ALLOWED_HEADERS`, `DEFAULT_RATE_LIMIT_WINDOW_MS` `900000`, `DEFAULT_RATE_LIMIT_MAX` `100`, `DEFAULT_SESSION_COOKIE_MAX_AGE` `86400000`, `IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY` `true`, `SHOULD_DEFAULT_SESSION_RESAVE` `false`, `SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED` `false`, `DEFAULT_STATIC_MAX_AGE` `1h`, `DEFAULT_IMMUTABLE_STATIC_MAX_AGE` `1y`, `DEFAULT_HEALTH_PATH` `/health`, `CRITICAL_HEAP_USAGE_RATIO` `0.98`.

`LOG_LEVELS` is `{ FATAL, ERROR, WARN, INFO, DEBUG, TRACE, SILENT }` and `LogLevel` is its value union.

`DEFAULT_REDACTED_PATHS` is `['req.headers.authorization', 'req.headers.cookie', 'password', 'token']`.

## Logger

```typescript
interface CreateLoggerOptions extends LoggerOptions {
  isDevelopment?: boolean;
  isTest?: boolean;
}
createLogger(options?: CreateLoggerOptions): Logger;
```

Defaults `level` to `config.logLevel`. Uses `pino.stdTimeFunctions.isoTime`, a `level` label formatter, and the default redaction paths. Pipes through `pino-pretty` when `isDevelopment` and not `isTest`.

## Errors

### `BaseError`

```typescript
interface ErrorMetadata {
  code?: ErrorCode;
  cause?: unknown;
  context?: Record<string, unknown>;
}
class BaseError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
  toJSON(): Record<string, unknown>;
}
```

Default `code` is `INTERNAL_ERROR`. `toJSON()` serializes an `Error` cause to `{ name, message, stack }`.

### `ERROR_CODES`

`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `VALIDATION_ERROR`, `CONFIG_ERROR`, `INTERNAL_ERROR`. `ErrorCode` is the value union widened with `(string & {})` for custom codes.

### `HttpError`

```typescript
new HttpError(statusCode: number, message: string, metadata?: ErrorMetadata);
new HttpError(message: string, statusCode?: number, metadata?: ErrorMetadata);
```

Status-first form wins when the first argument is a number. Default status is 500. The default code maps from the status: 400→`BAD_REQUEST`, 401→`UNAUTHORIZED`, 403→`FORBIDDEN`, 404→`NOT_FOUND`, 409→`CONFLICT`, 422→`VALIDATION_ERROR`, 429→`TOO_MANY_REQUESTS`, otherwise `INTERNAL_ERROR`.

Static factories: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `internal`. Each takes `(message?, metadata?)`.

### `ConfigError` and `ValidationError`

`new ConfigError(message, cause?, context?)` sets `code` to `CONFIG_ERROR`.
`new ValidationError(message, cause?, context?)` sets `code` to `VALIDATION_ERROR`.

## Server Module

```typescript
type CleanupHook = () => Promise<void> | void;
interface ShutdownOptions { timeoutMs?: number; cleanupHooks?: CleanupHook[]; logger?: Logger; }
closeServerGracefully(server: Server, options?: ShutdownOptions): Promise<void>;
setupGracefulShutdown(server: Server, options?: ShutdownOptions): void;
```

`closeServerGracefully` closes the server when `server.listening`, calls `closeIdleConnections` when available, then awaits each hook in order. It never calls `process.exit`.

`setupGracefulShutdown` installs `SIGTERM`, `SIGINT`, `uncaughtException`, and `unhandledRejection` handlers, ignores duplicate shutdown triggers, and arms a non-ref'd force-exit timer at `timeoutMs`. Handlers detach on the server's `close` event.

## Response Shapes

Default 404 body:

```json
{ "status": 404, "error": "Not Found", "message": "Cannot GET /missing-route" }
```

Default error body:

```json
{ "status": 500, "error": "HttpError", "message": "User not found" }
```

`stack` is added only in development, and the message for a 500 is replaced with `An internal server error occurred.` in production.
