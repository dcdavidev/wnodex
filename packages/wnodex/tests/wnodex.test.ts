import { describe, expect, it, vi } from 'vitest';

import supertest from 'supertest';

import {
  createDatabaseHealthPlugin,
  createLogger,
  Wnodex,
} from '../src/index.js';

describe('Wnodex class', () => {
  it('initializes with full middleware shorthand options, serves requests, and shuts down', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const onListening = vi.fn();

    const wnodex = new Wnodex({
      port: 0,
      serviceName: 'Wnodex Class Server',
      logger: silentLogger,
      helmet: true,
      cors: { origin: 'https://example.com' },
      compression: true,
      cookieParser: { secret: 'cookie-sec' },
      session: { secret: 'session-sec' },
      passport: true,
      hpp: ['allowedParam'],
      onListening,
    });

    expect(wnodex.getConfig().serviceName).toBe('Wnodex Class Server');
    expect(wnodex.getLogger()).toBe(silentLogger);

    const app = wnodex.getApp();
    app.get('/hello', (_req, res) => {
      res.status(200).send('OK');
    });

    await wnodex.start();
    expect(wnodex.getServer()?.listening).toBe(true);
    expect(onListening).toHaveBeenCalledOnce();

    const response = await supertest(app).get('/hello');
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');

    const chores = vi.fn().mockResolvedValue(undefined);
    await wnodex.shutdown(chores);
    expect(chores).toHaveBeenCalledOnce();
    expect(wnodex.getServer()).toBeUndefined();
  });

  it('registers health plugins dynamically via registerHealthPlugin()', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const wnodex = new Wnodex({
      port: 0,
      logger: silentLogger,
    });

    wnodex.registerHealthPlugin(
      createDatabaseHealthPlugin(async () => true, { name: 'primary-db' })
    );

    const res = await supertest(wnodex.getApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.services['primary-db'].status).toBe('up');
  });

  it('handles errors thrown inside shutdown cleanup chores gracefully', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const errorSpy = vi.spyOn(silentLogger, 'error');
    const chores = vi.fn().mockRejectedValue(new Error('Cleanup failed'));

    const wnodex = new Wnodex({ port: 0, logger: silentLogger });
    await wnodex.start();
    await wnodex.shutdown(chores);

    expect(chores).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      { err: expect.any(Error) as unknown },
      'Error during cleanup chores'
    );
    expect(wnodex.getServer()).toBeUndefined();
  });

  it('warns without throwing when shutdown is called on a non-running server', async () => {
    const silentLogger = createLogger({ level: 'silent' });
    const warnSpy = vi.spyOn(silentLogger, 'warn');
    const wnodex = new Wnodex({ port: 0, logger: silentLogger });

    await wnodex.shutdown();
    expect(warnSpy).toHaveBeenCalledWith('Server not running.');
  });
});
