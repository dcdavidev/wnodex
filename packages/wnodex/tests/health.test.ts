import { describe, expect, it } from 'vitest';

import supertest from 'supertest';

import {
  bytesToMegabytes,
  createApp,
  createDatabaseHealthPlugin,
  createHealthProbePlugin,
  createLogger,
  formatUptime,
  getMemoryStats,
  getProcessStats,
  getSystemStats,
  getUptimeStats,
  HealthModel,
  roundToTwoDecimals,
} from '../src/index.js';

describe('health/formatters & system-metrics', () => {
  it('formats uptime durations and rounds byte metrics accurately', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(45)).toBe('45s');
    expect(formatUptime(125)).toBe('2m 5s');
    expect(formatUptime(3661)).toBe('1h 1m 1s');
    expect(formatUptime(90_061)).toBe('1d 1h 1m 1s');

    expect(roundToTwoDecimals(12.3456)).toBe(12.35);
    expect(bytesToMegabytes(10 * 1024 * 1024)).toBe(10);
  });

  it('collects memory, system, process, and uptime stats', () => {
    const mem = getMemoryStats();
    expect(mem.heapUsedMb).toBeGreaterThan(0);
    expect(mem.heapTotalMb).toBeGreaterThan(0);
    expect(mem.rssMb).toBeGreaterThan(0);

    const sys = getSystemStats();
    expect(sys.cpuCores).toBeGreaterThan(0);
    expect(sys.totalMemoryMb).toBeGreaterThan(0);
    expect(sys.loadAverage).toHaveLength(3);

    const proc = getProcessStats();
    expect(proc.pid).toBe(process.pid);
    expect(proc.nodeVersion).toBe(process.version);

    const up = getUptimeStats();
    expect(up.seconds).toBeGreaterThanOrEqual(0);
    expect(typeof up.formatted).toBe('string');
  });
});

describe('health/model & plugins', () => {
  it('manages plugin registration, unregistration, and parent model inheritance', () => {
    const parentModel = new HealthModel([
      createHealthProbePlugin('redis', () => true),
    ]);
    const childModel = new HealthModel(
      [createHealthProbePlugin('search', () => true)],
      parentModel
    );

    expect(childModel.getPlugin('redis')).toBeDefined();
    expect(childModel.getPlugin('search')).toBeDefined();
    expect(childModel.getPlugins()).toHaveLength(2);

    expect(childModel.unregisterPlugin('search')).toBe(true);
    expect(childModel.unregisterPlugin('nonexistent')).toBe(false);
    expect(childModel.getPlugins()).toHaveLength(1);
  });

  it('evaluates createDatabaseHealthPlugin when returning true, false, or throwing', async () => {
    const upPlugin = createDatabaseHealthPlugin(async () => true);
    const upRes = await upPlugin.check();
    expect(upRes.status).toBe('up');
    expect(upRes.latencyMs).toBeGreaterThanOrEqual(0);

    const downPlugin = createDatabaseHealthPlugin(async () => false, {
      name: 'replica-db',
    });
    expect(downPlugin.name).toBe('replica-db');
    const downRes = await downPlugin.check();
    expect(downRes.status).toBe('down');

    const throwingPlugin = createDatabaseHealthPlugin(async () => {
      throw new Error('Timeout');
    });
    const errRes = await throwingPlugin.check();
    expect(errRes.status).toBe('down');
    expect(errRes.error).toBe('Timeout');
  });

  it('exposes /health, /health/live, and /health/ready on custom path with isolated plugins', async () => {
    const app = createApp({
      serviceName: 'Health Test Service',
      logger: createLogger({ level: 'silent' }),
      healthOptions: {
        path: '/status',
        plugins: [
          createDatabaseHealthPlugin(async () => true, { critical: true }),
          createHealthProbePlugin('cache', () => true, { critical: false }),
        ],
      },
    });

    const healthRes = await supertest(app).get('/status');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
    expect(healthRes.body.service).toBe('Health Test Service');
    expect(healthRes.body.services.database.status).toBe('up');
    expect(healthRes.body.services.cache.status).toBe('up');

    const liveRes = await supertest(app).get('/status/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.status).toBe('alive');

    const readyRes = await supertest(app).get('/status/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');
    expect(readyRes.body.checks.database).toBe('up');
  });

  it('marks /health as degraded and /health/ready as 503 when a critical plugin fails or throws', async () => {
    const app = createApp({
      logger: createLogger({ level: 'silent' }),
      healthOptions: {
        plugins: [
          {
            name: 'broken-plugin',
            critical: true,
            check: () => {
              throw new Error('Unexpected crash');
            },
          },
        ],
      },
    });

    const healthRes = await supertest(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('degraded');
    expect(healthRes.body.services['broken-plugin'].status).toBe('error');

    const readyRes = await supertest(app).get('/health/ready');
    expect(readyRes.status).toBe(503);
    expect(readyRes.body.status).toBe('not_ready');
    expect(readyRes.body.reason).toContain('broken-plugin');
  });
});
