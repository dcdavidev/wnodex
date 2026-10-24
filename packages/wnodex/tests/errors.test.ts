import { describe, expect, it } from 'vitest';

import {
  BaseError,
  ConfigError,
  ERROR_CODES,
  HttpError,
  ValidationError,
} from '../src/index.js';

describe('errors/base-error', () => {
  it('constructs BaseError with default code and serializes Error causes in toJSON()', () => {
    const rootCause = new Error('Disk read failure');
    const baseErr = new BaseError('Failed to initialize storage', {
      cause: rootCause,
      context: { path: '/var/data' },
    });

    expect(baseErr).toBeInstanceOf(Error);
    expect(baseErr).toBeInstanceOf(BaseError);
    expect(baseErr.name).toBe('BaseError');
    expect(baseErr.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(baseErr.cause).toBe(rootCause);
    expect(baseErr.context).toEqual({ path: '/var/data' });

    const serialized = baseErr.toJSON();
    expect(serialized).toMatchObject({
      name: 'BaseError',
      message: 'Failed to initialize storage',
      code: ERROR_CODES.INTERNAL_ERROR,
      context: { path: '/var/data' },
      cause: {
        name: 'Error',
        message: 'Disk read failure',
      },
    });
  });

  it('serializes primitive non-Error causes cleanly in toJSON()', () => {
    const err = new BaseError('Custom failure', {
      code: 'CUSTOM_CODE',
      cause: 'string-reason',
    });

    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.toJSON()).toMatchObject({
      name: 'BaseError',
      message: 'Custom failure',
      code: 'CUSTOM_CODE',
      cause: 'string-reason',
    });
  });
});

describe('errors/http-error', () => {
  it('supports both (statusCode, message) and (message, statusCode) signatures', () => {
    const err1 = new HttpError(404, 'Resource not found');
    expect(err1.statusCode).toBe(404);
    expect(err1.message).toBe('Resource not found');
    expect(err1.code).toBe(ERROR_CODES.NOT_FOUND);

    const err2 = new HttpError('Unauthorized access', 401);
    expect(err2.statusCode).toBe(401);
    expect(err2.message).toBe('Unauthorized access');
    expect(err2.code).toBe(ERROR_CODES.UNAUTHORIZED);

    const errDefault = new HttpError('Something broke');
    expect(errDefault.statusCode).toBe(500);
    expect(errDefault.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it('provides static factory helpers for common HTTP status codes', () => {
    expect(HttpError.badRequest().statusCode).toBe(400);
    expect(HttpError.badRequest().code).toBe(ERROR_CODES.BAD_REQUEST);

    expect(HttpError.unauthorized().statusCode).toBe(401);
    expect(HttpError.unauthorized().code).toBe(ERROR_CODES.UNAUTHORIZED);

    expect(HttpError.forbidden().statusCode).toBe(403);
    expect(HttpError.forbidden().code).toBe(ERROR_CODES.FORBIDDEN);

    expect(HttpError.notFound().statusCode).toBe(404);
    expect(HttpError.notFound().code).toBe(ERROR_CODES.NOT_FOUND);

    expect(HttpError.conflict().statusCode).toBe(409);
    expect(HttpError.conflict().code).toBe(ERROR_CODES.CONFLICT);

    expect(HttpError.tooManyRequests().statusCode).toBe(429);
    expect(HttpError.tooManyRequests().code).toBe(
      ERROR_CODES.TOO_MANY_REQUESTS
    );

    expect(HttpError.internal().statusCode).toBe(500);
    expect(HttpError.internal().code).toBe(ERROR_CODES.INTERNAL_ERROR);

    const validationHttp = new HttpError(422, 'Unprocessable');
    expect(validationHttp.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
});

describe('errors/config-error & validation-error', () => {
  it('constructs ConfigError and ValidationError with proper codes and metadata', () => {
    const cfgErr = new ConfigError('Invalid port', undefined, { port: -1 });
    expect(cfgErr).toBeInstanceOf(BaseError);
    expect(cfgErr.name).toBe('ConfigError');
    expect(cfgErr.code).toBe(ERROR_CODES.CONFIG_ERROR);
    expect(cfgErr.context).toEqual({ port: -1 });

    const valErr = new ValidationError('Invalid email', undefined, {
      field: 'email',
    });
    expect(valErr).toBeInstanceOf(BaseError);
    expect(valErr.name).toBe('ValidationError');
    expect(valErr.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(valErr.context).toEqual({ field: 'email' });
  });
});
