---
name: wnodex-health-checks
description: This skill should be used when the user asks to "add a health check in wnodex", "create a health check plugin", "add a readiness or liveness probe", "ping the database in a health check", "customize the /health endpoint", "disable health checks", or mentions wnodex health APIs such as createHealthRouter, HealthModel, createDatabaseHealthPlugin, createHealthProbePlugin, getReadiness, or the /health, /health/live, /health/ready endpoints. Covers the three endpoints, plugin authoring, Kubernetes probes, and disabling health checks.
---

# wnodex Health Checks

## Purpose

`wnodex` mounts three health endpoints and an extensible plugin model for probing external dependencies. The plugin model is what makes the checks meaningful: the built-in endpoints report process metrics, while plugins report the health of databases, caches, and third-party services.

Use this skill to expose health endpoints, author plugins, wire Kubernetes probes, and disable the endpoints when they are not wanted.

## When to Use

Activate this skill when adding liveness/readiness endpoints, probing a dependency (database, Redis, message broker), customizing the health path, or controlling whether a failing check should fail readiness.

## The Three Endpoints

Mounted at `DEFAULT_HEALTH_PATH` (`/health`) by default.

| Endpoint            | Handler        | Success | Failure                    | Purpose              |
| :------------------ | :------------- | :------ | :------------------------- | :------------------- |
| `GET /health`       | `getHealth`    | 200     | 503 when status is `error` | Detailed diagnostics |
| `GET /health/live`  | `getLiveness`  | 200     | —                          | Kubernetes liveness  |
| `GET /health/ready` | `getReadiness` | 200     | 503 when not ready         | Kubernetes readiness |

`/health` returns `status: 'ok'` or `'degraded'`, and its HTTP status is 503 only when the report status is `'error'`. The built-in model never produces `'error'` — a failing critical plugin yields `'degraded'` — so `/health` responds 200 in practice. A 503 from `/health` requires a custom `HealthModel` that returns `'error'`. Use `/health/ready` for load-balancer gating. The report includes `service`, `environment`, `timestamp`, `uptime`, `process`, `memory`, and `system`, plus a `services` map when plugins are registered.

`/health/live` always returns 200 with `{ status: 'alive', timestamp, uptimeSeconds }`. It performs no dependency checks, which is the correct behaviour for a liveness probe: a liveness failure restarts the process, so it must not fail because a dependency is down.

`/health/ready` checks heap pressure first. When `heapUsed / heapTotal` exceeds `CRITICAL_HEAP_USAGE_RATIO` (0.98), it returns 503 with `reason: 'Critical memory pressure'` and `checks.memory: 'critical_saturation'` without running plugins. Otherwise it evaluates plugins and returns `checks` with `memory: 'ok'` plus one entry per plugin.

## Registering Plugins

Register plugins through `healthOptions.plugins` in `createApp`, or through `registerHealthPlugin` on a `Wnodex` instance.

```typescript
import { createApp, createDatabaseHealthPlugin } from 'wnodex';

const app = createApp({
  serviceName: 'Accounts Service',
  healthOptions: {
    plugins: [
      createDatabaseHealthPlugin(
        async () => {
          await db.ping();
        },
        { critical: true }
      ),
    ],
  },
});
```

```typescript
import { createDatabaseHealthPlugin, Wnodex } from 'wnodex';

const server = new Wnodex({ serviceName: 'Accounts Service' });

server.registerHealthPlugin(
  createDatabaseHealthPlugin(() => db.ping(), { critical: true })
);

await server.start();
```

`createHealthRouter` builds a scoped `HealthModel` that inherits from the shared default model when plugins are supplied, so per-app plugins never leak across independent app instances.

## Plugin Factories

### `createHealthProbePlugin(name, pingFn, options?)`

Wraps an async or sync probe into a latency-aware plugin. The returned `check` measures `latencyMs` and maps the outcome:

- `pingFn` resolves `false` → `status: 'down'`
- `pingFn` resolves anything else or `undefined` → `status: 'up'`
- `pingFn` throws → `status: 'down'` with `error` set to the message

`HealthProbePluginOptions`: `name` overrides the identifier, `critical` defaults to `true`.

### `createDatabaseHealthPlugin(pingFn, options?)`

A thin wrapper over `createHealthProbePlugin` that fixes the name to `database`. Use it for PostgreSQL, Prisma, MongoDB, or any query that proves the connection is live.

```typescript
import { createDatabaseHealthPlugin, createHealthProbePlugin } from 'wnodex';

createDatabaseHealthPlugin(() => prisma.$queryRaw`SELECT 1`, {
  critical: true,
});
createHealthProbePlugin('redis', () => redis.ping(), {
  name: 'cache',
  critical: false,
});
```

Note the default `critical` is `true`, unlike the base `HealthPlugin` interface where it defaults to `false`. Set `critical: false` for dependencies whose outage degrades the service but should not remove the instance from the load balancer.

## Authoring a Custom Plugin

Implement the `HealthPlugin` interface directly when a factory does not fit.

```typescript
import type { HealthPlugin } from 'wnodex';

export const queuePlugin: HealthPlugin = {
  name: 'queue',
  critical: false,
  async check(app) {
    const started = Date.now();
    const depth = await queue.depth();
    return {
      status: depth < 10_000 ? 'ok' : 'degraded',
      latencyMs: Date.now() - started,
      depth,
    };
  },
};
```

`check` receives the Express `Application`, so a plugin can read application settings registered via `app.set`:

```typescript
const check: HealthPlugin['check'] = async (app) => {
  const client = app?.get('redisClient') as Redis | undefined;
  return client ? { status: 'ok' } : { status: 'down', error: 'No client' };
};
```

A plugin result is a `HealthPluginResult`: `status` is required and may be `'ok'`, `'up'`, `'down'`, `'error'`, `'degraded'`, or any string. Optional fields are `latencyMs`, `error`, and `message`, and arbitrary extra keys are allowed for diagnostics.

## Failure Semantics

A plugin affects readiness only when it is `critical`. The model treats the statuses `down`, `error`, and `not_ready` as failing.

| Scenario             | Plugin critical | Overall                            |
| :------------------- | :-------------- | :--------------------------------- |
| Probe returns `down` | yes             | Not ready, 503                     |
| Probe returns `down` | no              | Ready, 503 not triggered           |
| Probe throws         | yes             | Not ready, 503, `error` recorded   |
| Probe throws         | no              | Ready, error recorded in `details` |

When any critical plugin fails, `/health` reports `status: 'degraded'` and `/health/ready` reports `status: 'not_ready'` with `reason: 'Critical check failed: <name>'`.

## Managing the Plugin Registry

`HealthModel` exposes the registry directly.

```typescript
import { HealthModel } from 'wnodex';

const model = new HealthModel([dbPlugin]);
model.registerPlugin(redisPlugin);
model.unregisterPlugin('redis');
model.getPlugin('database');
model.getPlugins();
model.collectPlugins(app);
```

`registerPlugin` keys by `name`, so re-registering the same name replaces the previous plugin. `getPlugins` merges this model's plugins with a parent model's, with the child winning on name conflicts. `collectPlugins(app)` additionally merges plugins found on `app.get('healthPlugins')`, which is how `registerHealthPlugin` and `createHealthRouter` share a single registry.

## Customizing and Disabling

Change the mount path with `healthOptions.path`, pass a pre-built model with `healthOptions.model`, or disable the endpoints entirely.

```typescript
import { createApp } from 'wnodex';

createApp({ healthOptions: { path: '/-/health' } });
createApp({ enableHealthCheck: false }); // no /health routes at all
```

When `enableHealthCheck` is false, requests to `/health` fall through to the 404 handler.

## Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

Point liveness at `/health/live` so a dependency outage does not trigger restarts. Point readiness at `/health/ready` so the instance is removed from the load balancer while dependencies are unavailable. Mark only genuinely load-balancer-relevant dependencies as `critical`.

## Verification Checklist

1. Confirm `/health/live` returns 200 regardless of dependency state.
2. Confirm `/health/ready` returns 503 when a critical plugin fails, by temporarily making the probe throw.
3. Confirm `/health` includes a `services` entry for each registered plugin.
4. Confirm plugin names are unique — a duplicate name silently replaces the earlier plugin.
5. Confirm plugins release any resources they open; a probe must not leak connections.

## Additional Resources

### Reference Files

- **`references/probe-recipes.md`** — concrete probes for PostgreSQL, Prisma, MongoDB, Redis, HTTP dependencies, and a degraded-not-critical cache.

### Related Skills

- **`wnodex`** — core API, configuration, lifecycle, and error handling.
- **`wnodex-middlewares`** — middleware options, defaults, and ordering.
- **`wnodex-development`** — repository architecture, conventions, and release workflow.
