---
name: wnodex-server
description: This skill should be used when the user asks to "start a wnodex server", "set up graceful shutdown in wnodex", "add cleanup hooks on server shutdown", "close a wnodex server in tests", "handle SIGTERM or SIGINT in wnodex", or mentions wnodex/server, startServer, createServer, setupGracefulShutdown, closeServerGracefully, CleanupHook, ShutdownOptions, StartServerOptions, CreateServerOptions, or ServerInstance. Covers HTTP server startup, connection draining, cleanup hooks, OS signal handling, and programmatic shutdown.
---

# wnodex Server Lifecycle & Graceful Shutdown

## Purpose

`wnodex/server` (and the top-level server primitives in `wnodex`) manage HTTP server startup, connection draining, resource cleanup hooks, and OS signal handling (`SIGTERM`, `SIGINT`, `uncaughtException`, `unhandledRejection`).

Use this skill to start an HTTP server, register ordered cleanup hooks for databases/caches/queues, configure shutdown timeouts, and close servers cleanly in tests without exiting the Node.js process.

## When to Use

Activate this skill when starting a server with `startServer`, `createServer`, or `Wnodex.start()`, wiring database or cache teardown into `cleanupHooks`, tuning `timeoutMs` / `SHUTDOWN_TIMEOUT_MS`, or closing ephemeral servers in integration tests via `closeServerGracefully` or `Wnodex.shutdown()`.

## Subpath Imports

```typescript
import {
  type CleanupHook,
  closeServerGracefully,
  setupGracefulShutdown,
  type ShutdownOptions,
} from 'wnodex/server';
import {
  createServer,
  type CreateServerOptions,
  type ServerInstance,
  startServer,
  type StartServerOptions,
  Wnodex,
} from 'wnodex';
```

All `wnodex/server` exports are also re-exported from the root `wnodex` entry point.

## Starting the HTTP Server

### 1. `startServer(appOrOptions?, maybeOptions?): Server`

Starts a Node.js `http.Server` and automatically attaches `setupGracefulShutdown`.

`startServer` supports two call signatures:

- **`startServer(app, options?)`**: When the first argument has a `.listen` function, it is used as the Express application and `maybeOptions` provides `StartServerOptions`.
- **`startServer(options?)`**: When the first argument is an options object (or omitted), `startServer` calls `createApp(options)` internally before listening.

| Option         | Type                                          | Fallback Chain                                                                               |
| :------------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------- |
| `config`       | `ServerConfig`                                | `config` singleton (`host`, `port`, `nodeEnv`, `shutdownTimeoutMs`)                          |
| `logger`       | `Logger`                                      | `options.logger` → `app.get('logger')` → `logger` singleton                                  |
| `serviceName`  | `string`                                      | `options.serviceName` → `app.get('serviceName')` → `config.serviceName` → `'Express server'` |
| `timeoutMs`    | `number`                                      | `options.timeoutMs` → `activeConfig.shutdownTimeoutMs` (`10000` ms)                          |
| `cleanupHooks` | `CleanupHook[]`                               | `[]`                                                                                         |
| `onListening`  | `(info: { host, port, server, app }) => void` | —                                                                                            |

### 2. `createServer(options?): ServerInstance`

Combines `createApp` and `startServer` in a single call and returns `{ app, server, logger, config }`.

### 3. `Wnodex.start(): Promise<Server>`

Unlike `startServer` (which returns `Server` synchronously while binding asynchronously), `await wnodex.start()` returns a `Promise<Server>` that resolves once the `"listening"` callback fires and rejects on `"error"`.

Signal-based shutdown difference:

- `startServer` and `createServer` **always** call `setupGracefulShutdown(server, ...)`.
- `Wnodex.start()` calls `setupGracefulShutdown(server, ...)` **only** when `autoSignalShutdown: true` is passed in `WnodexOptions` (default is `false`, giving manual control via `await wnodex.shutdown()`).

## Programmatic Shutdown (`closeServerGracefully`)

```typescript
type CleanupHook = () => Promise<void> | void;

interface ShutdownOptions {
  timeoutMs?: number;
  cleanupHooks?: CleanupHook[];
  logger?: Logger;
}

closeServerGracefully(server: Server, options?: ShutdownOptions): Promise<void>;
```

`closeServerGracefully` drains the server and runs cleanup hooks **without calling `process.exit`**:

1. If `server.listening` is true:
   - Awaits `server.close()` (stops accepting new connections and waits for in-flight requests).
   - Calls `server.closeIdleConnections()` (if available on `Server`) to immediately close idle HTTP keep-alive sockets.
   - Logs `'HTTP server successfully stopped accepting connections.'`.
2. Iterates through `cleanupHooks` sequentially (`for (const hook of cleanupHooks) await hook()`).

If `server.listening` is already false, step 1 is skipped and `cleanupHooks` still execute in order.

### `Wnodex.shutdown(chores?): Promise<void>`

- If the server is not running (`!this.server`), logs a warning (`'Server not running.'`) and returns immediately without running hooks.
- If a one-off `chores` callback is passed, prepends it (`hooks.unshift(...)`) **ahead** of `this.options.cleanupHooks`, wrapped in a `try/catch` that logs `'Error during cleanup chores'` without aborting the remaining `cleanupHooks`.
- Delegates to `closeServerGracefully` and resets `this.server = undefined`.

## OS Signal & Fatal Error Coordinator (`setupGracefulShutdown`)

```typescript
setupGracefulShutdown(server: Server, options?: ShutdownOptions): void;
```

Registers four process-level listeners and coordinates a single, idempotent shutdown sequence:

| Trigger              | Log Level | Exit Code | Notes                                           |
| :------------------- | :-------- | :-------- | :---------------------------------------------- |
| `SIGTERM`            | `info`    | `0`       | Kubernetes / container orchestrator stop signal |
| `SIGINT`             | `info`    | `0`       | Ctrl+C terminal interrupt                       |
| `uncaughtException`  | `fatal`   | `1`       | Logs `{ err: error }` before starting shutdown  |
| `unhandledRejection` | `fatal`   | `1`       | Logs `{ reason }` before starting shutdown      |

Key guarantees of `setupGracefulShutdown`:

1. **Duplicate trigger guard**: Once a shutdown starts (`isShuttingDown = true`), subsequent signals log `'Shutdown already in progress. Ignoring duplicate trigger: <trigger>'` and return.
2. **Unref'd safety timer**: Arms a `setTimeout` for `timeoutMs` (default `10_000` ms) that logs an error and calls `process.exit(1)` if draining or cleanup hooks hang. Calls `forceExitTimer.unref()` so the timer never keeps the event loop alive on its own.
3. **Automatic listener cleanup**: Attaches `server.once('close', ...)` to remove the `SIGTERM`, `SIGINT`, `uncaughtException`, and `unhandledRejection` listeners whenever the server closes programmatically, preventing `MaxListenersExceededWarning` in test suites.

## Ordering Cleanup Hooks

Because `cleanupHooks` run **after** the HTTP server stops accepting connections and sequentially in array order, order them from application-level consumers down to foundational storage:

1. Flush telemetry / background job queues.
2. Disconnect cache / pub-sub clients (e.g., Redis).
3. Close primary database connection pools (e.g., PostgreSQL / Prisma / MongoDB).

## Verification Checklist

1. Confirm `cleanupHooks` are ordered so in-flight work finishes before database pools close.
2. Confirm `autoSignalShutdown: true` is set when using `new Wnodex()` in production containers that rely on `SIGTERM`.
3. Confirm `timeoutMs` (`SHUTDOWN_TIMEOUT_MS`) is shorter than Kubernetes `terminationGracePeriodSeconds` (default 30s) so the process exits cleanly before `SIGKILL`.
4. Confirm tests use `loadConfig({ port: 0 })` and call `await closeServerGracefully(server)` (or `await wnodex.shutdown()`) before the test ends.

## Additional Resources

### Reference Files

- **`references/lifecycle-recipes.md`** — recipes for multi-resource teardown (Prisma + Redis + BullMQ), Kubernetes graceful termination alignment, `Wnodex` with `autoSignalShutdown`, and ephemeral server testing with `port: 0`.

### Related Skills

- **`wnodex`** — core API, application setup, and overview.
- **`wnodex-config`** — `PORT`, `HOST`, `SHUTDOWN_TIMEOUT_MS`, and `DEFAULT_SHUTDOWN_TIMEOUT_MS`.
- **`wnodex-logger`** — lifecycle and shutdown logging.
- **`wnodex-health-checks`** — how readiness probes interact with container rollout and termination.
- **`wnodex-development`** — testing conventions for server lifecycle suites.
