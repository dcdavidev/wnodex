import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import express from 'express';

import passport from 'passport';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import supertest from 'supertest';

import {
  bodyParserMiddlewares,
  compressionMiddleware,
  ConfigError,
  configurePassport,
  cookieParserMiddleware,
  corsMiddleware,
  createApp,
  createBodyParserMiddlewares,
  createCompressionMiddleware,
  createCookieParserMiddleware,
  createCorsMiddleware,
  createCorsOptions,
  createErrorHandler,
  createHelmetMiddleware,
  createHppMiddleware,
  createJsonBodyParser,
  createLogger,
  createNotFoundHandler,
  createPassportMiddlewares,
  createRateLimiter,
  createSessionMiddleware,
  createSessionOptions,
  createUrlencodedBodyParser,
  helmetMiddleware,
  hppMiddleware,
  HttpError,
  rateLimiter,
  registerStaticAssets,
  StaticAssets,
} from '../src/index.js';

describe('middlewares/security (helmet, cors, hpp)', () => {
  it('applies Helmet and CORS headers and HPP parameter pollution protection', async () => {
    const app = express();
    app.use(createHelmetMiddleware({ contentSecurityPolicy: false }));
    app.use(
      createCorsMiddleware({
        origin: 'https://allowed.example.com',
        methods: ['GET', 'POST'],
      })
    );
    app.use(createHppMiddleware(['tags']));

    app.get('/query', (req, res) => {
      res.json({ query: req.query });
    });

    const res = await supertest(app)
      .get('/query?tags=a&tags=b&single=1&single=2')
      .set('Origin', 'https://allowed.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://allowed.example.com'
    );
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.body.query).toEqual({
      tags: ['a', 'b'],
      single: '2',
    });
  });

  it('builds default CORS options and exports default security middleware instances', () => {
    const opts = createCorsOptions({ credentials: false });
    expect(opts.credentials).toBe(false);
    expect(opts.methods).toContain('GET');
    expect(typeof helmetMiddleware).toBe('function');
    expect(typeof corsMiddleware).toBe('function');
    expect(typeof hppMiddleware).toBe('function');
  });
});

describe('middlewares/body-parser', () => {
  it('parses JSON and URL-encoded bodies with string limit or BodyParserOptions', async () => {
    const app = express();
    for (const mw of createBodyParserMiddlewares('2mb')) {
      app.use(mw);
    }

    app.post('/data', (req, res) => {
      res.json({ received: req.body as unknown });
    });

    const jsonRes = await supertest(app).post('/data').send({ a: 1 });
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body).toEqual({ received: { a: 1 } });

    const formRes = await supertest(app)
      .post('/data')
      .type('form')
      .send('key=value&nested[x]=10');
    expect(formRes.status).toBe(200);
    expect(formRes.body).toEqual({
      received: { key: 'value', nested: { x: '10' } },
    });

    expect(typeof createJsonBodyParser({ limit: '500kb' })).toBe('function');
    expect(
      typeof createUrlencodedBodyParser({ limit: '500kb', extended: false })
    ).toBe('function');
    expect(bodyParserMiddlewares).toHaveLength(2);
  });
});

describe('middlewares/compression & cookie-parser', () => {
  it('parses cookies with string secret, array of secrets, or options object', async () => {
    const app = express();
    app.use(createCompressionMiddleware());
    app.use(
      createCookieParserMiddleware({
        secret: ['sec1', 'sec2'],
      })
    );

    app.get('/cookies', (req, res) => {
      res.json({ cookies: req.cookies as unknown });
    });

    const res = await supertest(app)
      .get('/cookies')
      .set('Cookie', ['lang=it; mode=compact']);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      cookies: { lang: 'it', mode: 'compact' },
    });

    expect(typeof createCookieParserMiddleware('single-secret')).toBe(
      'function'
    );
    expect(typeof createCookieParserMiddleware(['s1', 's2'])).toBe('function');
    expect(typeof createCookieParserMiddleware()).toBe('function');
    expect(typeof compressionMiddleware).toBe('function');
    expect(typeof cookieParserMiddleware).toBe('function');
  });
});

describe('middlewares/rate-limiter', () => {
  it('enforces request rate limits and returns 429 JSON payload when exceeded', async () => {
    const app = express();
    app.use(
      createRateLimiter({
        windowMs: 60_000,
        limit: 2,
      })
    );
    app.get('/limited', (_req, res) => {
      res.json({ ok: true });
    });

    const res1 = await supertest(app).get('/limited');
    const res2 = await supertest(app).get('/limited');
    const res3 = await supertest(app).get('/limited');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(429);
    expect(res3.body).toEqual({
      status: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
    expect(typeof rateLimiter).toBe('function');
  });
});

describe('middlewares/session & passport', () => {
  it('validates session secret requirement and creates session options with defaults', () => {
    expect(() => createSessionOptions({})).toThrow(ConfigError);
    expect(() => createSessionOptions({ secret: ' '.repeat(3) })).toThrow(
      ConfigError
    );
    expect(() => createSessionOptions({ secret: [] })).toThrow(ConfigError);

    const opts = createSessionOptions({
      secret: 'super-secret',
      isProduction: true,
      cookie: { maxAge: 10_000 },
    });
    expect(opts.secret).toBe('super-secret');
    expect(opts.resave).toBe(false);
    expect(opts.saveUninitialized).toBe(false);
    expect(opts.cookie?.httpOnly).toBe(true);
    expect(opts.cookie?.secure).toBe(true);
    expect(opts.cookie?.maxAge).toBe(10_000);
    expect(typeof createSessionMiddleware({ secret: 'sec' })).toBe('function');
  });

  it('configures Passport with boolean toggle, custom instance, or options object', () => {
    const app = express();
    expect(configurePassport(app, false)).toBeUndefined();

    const defaultAuth = configurePassport(app, true);
    expect(defaultAuth).toBeDefined();
    expect(app.get('passport')).toBe(defaultAuth);

    const customPassport = new passport.Passport();
    const configuredCustom = configurePassport(app, {
      instance: customPassport,
      session: false,
    });
    expect(configuredCustom).toBe(customPassport);
    expect(app.get('passport')).toBe(customPassport);

    expect(createPassportMiddlewares()).toHaveLength(2);
    expect(createPassportMiddlewares({ session: false })).toHaveLength(1);
    expect(createPassportMiddlewares(customPassport)).toHaveLength(2);
  });
});

describe('middlewares/static', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wnodex-static-'));
    const staticSub = path.join(tempDir, 'static');
    fs.mkdirSync(staticSub, { recursive: true });
    fs.writeFileSync(path.join(staticSub, 'app.js'), 'console.log("static");');
    fs.writeFileSync(path.join(tempDir, 'robots.txt'), 'User-agent: *');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('serves immutable /static assets and root static files', async () => {
    const app = express();
    registerStaticAssets(app, tempDir);

    const staticRes = await supertest(app).get('/static/app.js');
    expect(staticRes.status).toBe(200);
    expect(staticRes.text).toContain('console.log("static");');
    expect(staticRes.headers['cache-control']).toContain('immutable');

    const rootRes = await supertest(app).get('/robots.txt');
    expect(rootRes.status).toBe(200);
    expect(rootRes.text).toContain('User-agent: *');

    expect(StaticAssets.register).toBe(registerStaticAssets);
  });
});

describe('middlewares/error-handler', () => {
  it('formats 404 Not Found with default message, custom string, or callback', async () => {
    const app1 = express();
    app1.use(createNotFoundHandler('Custom 404 message'));
    const res1 = await supertest(app1).get('/unknown');
    expect(res1.status).toBe(404);
    expect(res1.body.message).toBe('Custom 404 message');

    const app2 = express();
    app2.use(createNotFoundHandler((req) => `Missing path: ${req.path}`));
    const res2 = await supertest(app2).get('/missing');
    expect(res2.status).toBe(404);
    expect(res2.body.message).toBe('Missing path: /missing');
  });

  it('hides internal 500 error details in production and includes stack in development', async () => {
    const silentLogger = createLogger({ level: 'silent' });

    const prodApp = createApp({
      logger: silentLogger,
      routes: (app) => {
        app.get('/fatal', () => {
          throw new Error('Sensitive DB query failed');
        });
      },
      errorHandler: createErrorHandler({
        logger: silentLogger,
        isDevelopment: false,
        isProduction: true,
      }),
    });

    const prodRes = await supertest(prodApp).get('/fatal');
    expect(prodRes.status).toBe(500);
    expect(prodRes.body.message).toBe('An internal server error occurred.');
    expect(prodRes.body.stack).toBeUndefined();

    const devApp = createApp({
      logger: silentLogger,
      routes: (app) => {
        app.get('/bad', () => {
          throw HttpError.badRequest('Validation failed');
        });
      },
      errorHandler: createErrorHandler({
        logger: silentLogger,
        isDevelopment: true,
        isProduction: false,
      }),
    });

    const devRes = await supertest(devApp).get('/bad');
    expect(devRes.status).toBe(400);
    expect(devRes.body.message).toBe('Validation failed');
    expect(devRes.body.stack).toBeDefined();
  });
});
