import { Router } from 'express';

import { describe, expect, it, vi } from 'vitest';

import supertest from 'supertest';

import {
  closeServerGracefully,
  createApp,
  createLogger,
  createServer,
  HttpError,
  loadConfig,
  startServer,
} from '../src/index.js';

describe('app & server lifecycle', () => {
  it('mounts Router, configure callback, custom settings, and dynamic post-creation routes', async () => {
    const router = Router();
    router.get('/router-path', (_req, res) => {
      res.json({ from: 'router' });
    });

    const app = createApp({
      serviceName: 'Accounts Service',
      logger: createLogger({ level: 'silent' }),
      trustProxy: 2,
      disableXPoweredBy: true,
      settings: {
        apiVersion: 'v2',
      },
      routes: router,
      configure: (expressApp) => {
        expressApp.get('/configured', (_req, res) => {
          res.json({ configured: true });
        });
      },
    });

    // Post-creation route and param registration
    app.param('id', (_req, _res, next, id: string) => {
      if (id === '0') {
        next(HttpError.badRequest('Invalid ID 0'));
        return;
      }
      next();
    });

    app.get('/items/:id', (req, res) => {
      res.json({
        id: req.params.id,
        service: req.app.get('serviceName') as string,
        version: req.app.get('apiVersion') as string,
      });
    });

    app
      .route('/chained')
      .get((_req, res) => res.json({ method: 'GET' }))
      .post((_req, res) => res.status(201).json({ method: 'POST' }));

    expect(app.get('trust proxy')).toBe(2);
    expect(app.get('x-powered-by')).toBe(false);

    const routerRes = await supertest(app).get('/router-path');
    expect(routerRes.status).toBe(200);
    expect(routerRes.body).toEqual({ from: 'router' });

    const configuredRes = await supertest(app).get('/configured');
    expect(configuredRes.status).toBe(200);
    expect(configuredRes.body).toEqual({ configured: true });

    const itemRes = await supertest(app).get('/items/42');
    expect(itemRes.status).toBe(200);
    expect(itemRes.body).toEqual({
      id: '42',
      service: 'Accounts Service',
      version: 'v2',
    });

    const invalidParamRes = await supertest(app).get('/items/0');
    expect(invalidParamRes.status).toBe(400);
    expect(invalidParamRes.body.message).toBe('Invalid ID 0');

    const chainedPostRes = await supertest(app).post('/chained');
    expect(chainedPostRes.status).toBe(201);
    expect(chainedPostRes.body).toEqual({ method: 'POST' });

    const notFoundRes = await supertest(app).get('/missing-route');
    expect(notFoundRes.status).toBe(404);
  });

  it('can disable health check endpoints when enableHealthCheck is false', async () => {
    const app = createApp({
      logger: createLogger({ level: 'silent' }),
      enableHealthCheck: false,
    });

    const res = await supertest(app).get('/health');
    expect(res.status).toBe(404);
  });

  it('starts server via startServer(options) and closes gracefully with cleanup hooks', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const onListening = vi.fn();
    const cleanupHook = vi.fn().mockResolvedValue(undefined);

    const server = startServer({
      config: loadConfig({ port: 0 }),
      logger: silentLogger,
      serviceName: 'Direct Start Server',
      onListening,
    });

    await new Promise<void>((resolve) => {
      if (server.listening) {
        resolve();
      } else {
        server.once('listening', () => resolve());
      }
    });

    expect(onListening).toHaveBeenCalledOnce();

    await closeServerGracefully(server, {
      logger: silentLogger,
      cleanupHooks: [cleanupHook],
    });

    expect(cleanupHook).toHaveBeenCalledOnce();
    expect(server.listening).toBe(false);
  });

  it('creates and starts full ServerInstance via createServer()', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const instance = createServer({
      config: loadConfig({ port: 0 }),
      logger: silentLogger,
      serviceName: 'Ephemeral Server',
      routes: (app) => {
        app.get('/ping', (_req, res) => {
          res.json({ pong: true });
        });
      },
    });

    const res = await supertest(instance.app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });

    await closeServerGracefully(instance.server, { logger: silentLogger });
  });
});
