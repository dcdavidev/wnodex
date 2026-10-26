# Health Probe Recipes

Concrete `HealthPlugin` implementations for common dependencies. Each recipe states whether the plugin should be `critical` and why.

## PostgreSQL with `pg`

```typescript
import { Pool } from 'pg';
import { createDatabaseHealthPlugin } from 'wnodex';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dbPlugin = createDatabaseHealthPlugin(
  async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  },
  { critical: true }
);
```

Critical: without the database the service cannot serve its primary traffic. The probe releases the client in a `finally` block so a failing query does not leak a connection from the pool.

## Prisma

```typescript
import { PrismaClient } from '@prisma/client';
import { createDatabaseHealthPlugin } from 'wnodex';

const prisma = new PrismaClient();

export const prismaPlugin = createDatabaseHealthPlugin(
  () => prisma.$queryRaw`SELECT 1`,
  { critical: true }
);
```

Critical: same reasoning as the `pg` recipe. `$queryRaw` round-trips to the database, unlike `$connect`, which resolves from the local connection state.

## MongoDB

```typescript
import { MongoClient } from 'mongodb';
import { createDatabaseHealthPlugin } from 'wnodex';

const client = new MongoClient(process.env.MONGO_URL!);

export const mongoPlugin = createDatabaseHealthPlugin(
  async () => {
    await client.db('admin').command({ ping: 1 });
  },
  { critical: true }
);
```

Critical: the `ping` command is the lightest round-trip that proves the connection is usable.

## Redis

```typescript
import { createClient } from 'redis';
import { createHealthProbePlugin } from 'wnodex';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export const redisPlugin = createHealthProbePlugin(
  'redis',
  () => redis.ping(),
  {
    critical: true,
  }
);
```

Critical when Redis backs sessions or the rate-limit store: a failed store means authentication and throttling misbehave. Mark it non-critical when Redis is a pure cache that can miss.

## HTTP Dependency

```typescript
import { createHealthProbePlugin } from 'wnodex';

export const paymentsPlugin = createHealthProbePlugin(
  'payments',
  async () => {
    const res = await fetch(`${process.env.PAYMENTS_URL}/healthz`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  },
  { critical: false }
);
```

Non-critical: a third-party outage should degrade the instance, not remove it from the load balancer, unless payments are the only function it serves. The abort signal bounds the probe so a hanging dependency cannot stall readiness.

## Cache as Degraded, Not Down

Return `degraded` instead of `down` to signal reduced capability without failing readiness.

```typescript
import type { HealthPlugin } from 'wnodex';

export const cachePlugin: HealthPlugin = {
  name: 'cache',
  critical: false,
  async check() {
    const started = Date.now();
    try {
      await cache.set('health', '1', { ttl: 5 });
      return { status: 'ok', latencyMs: Date.now() - started };
    } catch {
      return {
        status: 'degraded',
        latencyMs: Date.now() - started,
        message: 'Cache unavailable; serving from origin',
      };
    }
  },
};
```

Non-critical and `degraded`: the value appears in `/health` diagnostics and in `/health/ready` `checks`, but the endpoint still returns 200.

## Disk or Filesystem Probe

```typescript
import { statfs } from 'node:fs/promises';
import { createHealthProbePlugin } from 'wnodex';

export const diskPlugin = createHealthProbePlugin(
  'disk',
  async () => {
    const stats = await statfs('/');
    const freeRatio = stats.bfree / stats.blocks;
    return freeRatio > 0.05;
  },
  { critical: false }
);
```

Non-critical: low disk is an operational signal that belongs in alerting, not in the readiness gate, unless the service writes to disk on every request. The `statfs` and `bfree` names come from the `node:fs/promises` and `node:fs` APIs.

## Wiring Multiple Plugins

```typescript
import { createApp } from 'wnodex';

export const app = createApp({
  serviceName: 'orders-api',
  healthOptions: {
    plugins: [dbPlugin, redisPlugin, paymentsPlugin, diskPlugin],
  },
});
```

Notes: order does not affect the outcome, since plugins are evaluated sequentially and each result is recorded independently. Names must be unique — a later plugin with the same `name` replaces an earlier one in the registry.

## Testing a Plugin

Probe the plugin directly, and probe the endpoint through the router.

```typescript
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, createDatabaseHealthPlugin, createLogger } from 'wnodex';

describe('health plugins', () => {
  it('fails readiness when a critical probe throws', async () => {
    const app = createApp({
      logger: createLogger({ level: 'silent' }),
      healthOptions: {
        plugins: [
          createDatabaseHealthPlugin(
            () => {
              throw new Error('connection refused');
            },
            { critical: true }
          ),
        ],
      },
    });

    const res = await supertest(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe('down');
  });
});
```

Notes: pass `createLogger({ level: 'silent' })` so probe failures do not flood the test output. Use `supertest` against the app directly rather than starting a listener.
