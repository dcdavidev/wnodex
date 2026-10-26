# wnodex Architecture

Module dependency graph, the application middleware pipeline, and the export surface of each subpath.

## Module Dependency Graph

Arrows point from importer to imported module.

```text
index.ts
  └─> app, config, constants, errors, health, logger, middlewares, server, server/index, wnodex

wnodex.ts (Wnodex class)
  └─> app (createApp)
  └─> config/env (loadConfig)
  └─> constants (DEFAULT_SERVICE_NAME)
  └─> health (types)
  └─> logger/logger (createLogger)
  └─> middlewares/* (option types only)
  └─> server (CreateServerOptions)
  └─> server/shutdown (CleanupHook, closeServerGracefully, setupGracefulShutdown)

server.ts (startServer, createServer)
  └─> app (createApp)
  └─> config/env (config)
  └─> constants (DEFAULT_SERVICE_NAME)
  └─> logger/logger (logger)
  └─> server/shutdown (setupGracefulShutdown)

app.ts (createApp)
  └─> config/env (config)
  └─> constants (DEFAULT_HEALTH_PATH)
  └─> health (createHealthRouter)
  └─> logger/logger (logger)
  └─> middlewares/* (every factory)

server/shutdown.ts
  └─> config/env (config)
  └─> logger/logger (logger)

middlewares/*.ts
  └─> config/env (config)   [cors, body-parser, cookie-parser, rate-limiter, session, error-handler]
  └─> constants             [cors, session, static]
  └─> errors                [session -> ConfigError, error-handler -> HttpError]

health/health.model.ts
  └─> config/env (config)
  └─> constants (CRITICAL_HEAP_USAGE_RATIO)
  └─> health/system-metrics, health/health.types

health/health.routes.ts
  └─> health/health.controller, health/health.model, health/health.types

health/health.controller.ts
  └─> health/health.model

logger/logger.ts
  └─> config/env (config)
  └─> constants (DEFAULT_REDACTED_PATHS)

errors/*.ts
  └─> errors/error-codes, errors/base-error   (no config or logger dependency)

config/env.ts
  └─> config/parsers, constants

config/parsers.ts
  └─> (pure, no internal dependencies)
```

Two properties follow from this graph and are worth preserving:

- `config/parsers.ts` and `errors/*` are dependency-free leaves, which keeps them trivially testable and free of import cycles.
- `app.ts` is the single place that wires middlewares into an application. `wnodex.ts` normalizes options and delegates to `createApp`, so middleware behaviour is defined once.

## The `createApp` Pipeline

Steps run in this exact order. The order is part of the contract.

| Step | Action                                                                        |
| :--- | :---------------------------------------------------------------------------- |
| 0a   | `app.set('logger', activeLogger)`, `app.set('nodeEnv', activeConfig.nodeEnv)` |
| 0b   | `app.set('serviceName', ...)` when a service name resolves                    |
| 0c   | Apply each entry of `settings` with `app.set`                                 |
| 0d   | Set `trust proxy` to `options.trustProxy` or default `1` when unset           |
| 0e   | Disable `x-powered-by` unless `disableXPoweredBy: false`                      |
| 1    | Helmet, unless `enableHelmet: false`                                          |
| 2    | CORS, unless `enableCors: false`                                              |
| 3    | Compression, when enabled or `compressionOptions` supplied                    |
| 4    | Body parser (JSON then urlencoded), unless `enableBodyParser: false`          |
| 5    | Cookie parser, when enabled or `cookieParserOptions` supplied                 |
| 6    | HPP, unless `enableHpp: false`                                                |
| 7    | Rate limiter, unless `enableRateLimit: false`                                 |
| 8    | Session, when enabled or `sessionOptions` supplied                            |
| 9    | Passport via `configurePassport`, when enabled or `passportOptions` supplied  |
| 10   | Health router mounted at `healthOptions.path` or `/health`                    |
| 11   | Static assets, when `staticOptions` supplied                                  |
| 12   | `routes`, invoked as a callback when it declares one parameter, else mounted  |
| 13   | `configure(app)` callback                                                     |
| 14   | Dynamic router, then the 404 handler                                          |
| 15   | Error handler: the custom `errorHandler` or `createErrorHandler(...)`         |

Steps 14 and 15 explain the post-creation routing behaviour. A `dynamicRouter` is mounted before the 404 and error handlers, and the app's routing methods are rebound to it. Routes registered after `createApp` therefore land ahead of the fallbacks. The one-argument `app.get(name)` form stays bound to Express's settings lookup.

## Subpath Export Surfaces

Each subpath maps to a compiled entry declared in `packages/wnodex/package.json` `exports`.

### `wnodex`

Everything below, re-exported. Prefer the root import in application code and subpaths when bundle size or intent matters.

### `wnodex/config`

`loadConfig`, `config`, `AppConfig`, `ServerConfig`, `parseEnvString`, `parseEnvInt`, `isEnvFlagEnabled`, `parseEnvOriginList`.

### `wnodex/constants`

`DEFAULT_NODE_ENV`, `DEFAULT_PORT`, `DEFAULT_HOST`, `DEFAULT_SERVICE_NAME`, `DEFAULT_SHUTDOWN_TIMEOUT_MS`, `DEFAULT_BODY_LIMIT`, `DEFAULT_CORS_ORIGIN`, `DEFAULT_CORS_METHODS`, `DEFAULT_CORS_ALLOWED_HEADERS`, `DEFAULT_RATE_LIMIT_WINDOW_MS`, `DEFAULT_RATE_LIMIT_MAX`, `DEFAULT_SESSION_COOKIE_MAX_AGE`, `IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY`, `SHOULD_DEFAULT_SESSION_RESAVE`, `SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED`, `DEFAULT_STATIC_MAX_AGE`, `DEFAULT_IMMUTABLE_STATIC_MAX_AGE`, `DEFAULT_HEALTH_PATH`, `CRITICAL_HEAP_USAGE_RATIO`, `LOG_LEVELS`, `LogLevel`, `DEFAULT_REDACTED_PATHS`.

### `wnodex/errors`

`BaseError`, `ErrorMetadata`, `HttpError`, `ConfigError`, `ValidationError`, `ERROR_CODES`, `ErrorCode`.

### `wnodex/health`

`HealthModel`, `healthModel`, `HealthController`, `healthController`, `createHealthRouter`, `healthRouter`, `createHealthProbePlugin`, `createDatabaseHealthPlugin`, `HealthProbePluginOptions`, `HealthPlugin`, `HealthPluginResult`, `HealthCheckOptions`, `DetailedHealthReport`, `LivenessReport`, `ReadinessReport`, `getMemoryStats`, `getSystemStats`, `getProcessStats`, `getUptimeStats`, `MemoryStats`, `SystemStats`, `ProcessStats`, `UptimeStats`, `roundToTwoDecimals`, `bytesToMegabytes`, `formatUptime`.

### `wnodex/logger`

`createLogger`, `CreateLoggerOptions`, `logger`, `LOG_LEVELS`, `LogLevel`.

### `wnodex/middlewares`

Per middleware: a `create*` factory and, where applicable, a default instance.

| Middleware    | Exports                                                                                                                                                                                                                             |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body parser   | `createBodyParserMiddlewares`, `createJsonBodyParser`, `createUrlencodedBodyParser`, `BodyParserOptions`, `JsonBodyParserOptions`, `UrlencodedBodyParserOptions`, `bodyParserMiddlewares`, `jsonBodyParser`, `urlencodedBodyParser` |
| Compression   | `createCompressionMiddleware`, `CompressionOptions`, `compressionMiddleware`                                                                                                                                                        |
| Cookie parser | `createCookieParserMiddleware`, `CookieParserOptions`, `CookieParseOptions`, `cookieParserMiddleware`                                                                                                                               |
| CORS          | `createCorsMiddleware`, `createCorsOptions`, `CorsOptions`, `corsMiddleware`, `corsOptions`                                                                                                                                         |
| Error handler | `createErrorHandler`, `createNotFoundHandler`, `ErrorHandlerOptions`, `errorHandler`, `notFoundHandler`; re-exports `BaseError`, `ConfigError`, `HttpError`, `ValidationError`, `ERROR_CODES`, `ErrorCode`, `ErrorMetadata`         |
| Helmet        | `createHelmetMiddleware`, `HelmetOptions`, `helmetMiddleware`                                                                                                                                                                       |
| HPP           | `createHppMiddleware`, `HppOptions`, `hppMiddleware`                                                                                                                                                                                |
| Passport      | `configurePassport`, `createPassportMiddlewares`, `PassportMiddlewareOptions`, `PassportStatic`                                                                                                                                     |
| Rate limiter  | `createRateLimiter`, `RateLimitOptions`, `rateLimiter`                                                                                                                                                                              |
| Session       | `createSessionMiddleware`, `createSessionOptions`, `SessionMiddlewareOptions`, `SessionOptions`, `SessionCookieOptions`                                                                                                             |
| Static        | `registerStaticAssets`, `StaticAssets`, `StaticAssetsOptions`                                                                                                                                                                       |

`middlewares/security.ts` is a convenience barrel re-exporting `cors`, `helmet`, and `hpp`.

### `wnodex/server`

`setupGracefulShutdown`, `closeServerGracefully`, `CleanupHook`, `ShutdownOptions`.

The root entry also re-exports `setupGracefulShutdown` and `closeServerGracefully` through `server/index.ts`.

The root also exports `createApp`, `CreateAppOptions`, `startServer`, `StartServerOptions`, `createServer`, `CreateServerOptions`, `ServerInstance`, `Wnodex`, and `WnodexOptions`.

## Extension Points

| Goal                                    | Extension point                                   |
| :-------------------------------------- | :------------------------------------------------ |
| Add middleware or routes after creation | `configure(app)` or the rebound routing methods   |
| Replace the 404 response                | `notFoundHandler` option                          |
| Replace error formatting                | `errorHandler` option                             |
| Add a health dependency                 | `healthOptions.plugins` or `registerHealthPlugin` |
| Change the health path                  | `healthOptions.path`                              |
| Supply a pre-built health model         | `healthOptions.model`                             |
| Inject app-level state                  | `settings`, read with `app.get(name)`             |
| Replace the logger                      | `logger` option, or `createLogger`                |
| Add shutdown work                       | `cleanupHooks` option                             |
| Share a Passport instance               | `passportOptions.instance`                        |
