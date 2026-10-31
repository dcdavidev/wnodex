# Server Lifecycle & Shutdown Recipes

Copy-ready patterns for starting, draining, and shutting down `wnodex` servers.

## 1. Multi-Resource Ordered Teardown (`startServer`)

Intent: drain HTTP traffic first, then stop background consumers, close Redis, and finally disconnect the database pool.

```typescript
import { createApp, loadConfig, startServer } from 'wnodex';

const config = loadConfig();
export const app = createApp({
  config,
  serviceName: 'orders-worker-api',
});

export const server = startServer(app, {
  config,
  serviceName: 'orders-worker-api',
  timeoutMs: 15_000,
  cleanupHooks: [
    async () => {
      await jobWorker.close();
    },
    async () => {
      await redis.quit();
    },
    async () => {
      await pgPool.end();
    },
  ],
  onListening: ({ host, port }) => {
    app.get('logger').info({ host, port }, 'Ready to accept traffic');
  },
});
```

## 2. Production `Wnodex` Class with `autoSignalShutdown` and Chores

Intent: use the object-oriented `Wnodex` class with automatic OS signal handling (`SIGTERM` / `SIGINT`) plus support for programmatic shutdown chores.

```typescript
import { Wnodex } from 'wnodex';

export const service = new Wnodex({
  port: 3000,
  serviceName: 'accounts-service',
  autoSignalShutdown: true,
  shutdownTimeoutMs: 10_000,
  cleanupHooks: [
    async () => {
      await prisma.$disconnect();
    },
  ],
});

await service.start();

// Later, if triggered programmatically (e.g., in an integration test or supervisor):
await service.shutdown(async () => {
  // Runs BEFORE `cleanupHooks`; errors here are logged and do not skip `cleanupHooks`
  await flushMetricsBuffer();
});
```

## 3. Ephemeral Port (`port: 0`) Testing with `closeServerGracefully`

Intent: bind a real TCP socket on an OS-assigned ephemeral port in Vitest, inspect the assigned port, and close cleanly without calling `process.exit`.

```typescript
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import {
  closeServerGracefully,
  createLogger,
  loadConfig,
  startServer,
} from 'wnodex';

describe('ephemeral HTTP server', () => {
  it('binds an ephemeral port and runs cleanup hooks on close', async () => {
    const logger = createLogger({ level: 'silent' });
    const releaseDb = vi.fn().mockResolvedValue(undefined);

    const server = startServer({
      config: loadConfig({ port: 0 }),
      logger,
      routes: (app) => {
        app.get('/ping', (_req, res) => res.json({ ok: true }));
      },
    });

    await new Promise<void>((resolve) => {
      if (server.listening) resolve();
      else server.once('listening', () => resolve());
    });

    const { port } = server.address() as AddressInfo;
    expect(port).toBeGreaterThan(0);

    const res = await fetch(`http://localhost:${port}/ping`);
    expect(res.status).toBe(200);

    await closeServerGracefully(server, {
      logger,
      cleanupHooks: [releaseDb],
    });

    expect(releaseDb).toHaveBeenCalledOnce();
    expect(server.listening).toBe(false);
  });
});
```

## 4. Attaching `setupGracefulShutdown` to a Custom `http.Server`

Intent: use `createApp` with a custom Node.js `http.createServer(app)` or `https.createServer(tlsOpts, app)` while still getting `wnodex`'s signal handling and connection draining.

```typescript
import http from 'node:http';
import { createApp, loadConfig, setupGracefulShutdown } from 'wnodex';

const config = loadConfig();
const app = createApp({ config, serviceName: 'custom-http-gateway' });
const server = http.createServer(app);

setupGracefulShutdown(server, {
  timeoutMs: config.shutdownTimeoutMs,
  logger: app.get('logger'),
  cleanupHooks: [
    async () => {
      await cacheClient.disconnect();
    },
  ],
});

server.listen(config.port, config.host);
```
