/**
 * @file Session management middleware integrating `express-session`.
 * @module middlewares/session
 */

import type { RequestHandler } from 'express';

import session, {
  type CookieOptions as SessionCookieOptions,
  type SessionOptions,
} from 'express-session';

import { config } from '../config/env.js';
import {
  DEFAULT_SESSION_COOKIE_MAX_AGE,
  IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY,
  SHOULD_DEFAULT_SESSION_RESAVE,
  SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED,
} from '../constants/index.js';
import { ConfigError } from '../errors/config-error.js';

export type {
  CookieOptions as SessionCookieOptions,
  SessionOptions,
} from 'express-session';

/**
 * Options for configuring the session middleware, with sensible security defaults.
 */
export interface SessionMiddlewareOptions extends Omit<
  SessionOptions,
  'secret'
> {
  /**
  Session secret string or array of secrets (falls back to `config.sessionSecret` / `SESSION_SECRET`)
  */
  secret?: string | string[];
  /**
  Override whether the environment is production (controls default `cookie.secure` flag)
  */
  isProduction?: boolean;
}

/**
 * Builds an `express-session` options object merged with secure defaults.
 *
 * @param [customOptions] - User-provided session configuration overrides.
 * @returns Resolved SessionOptions ready for `express-session`.
 */
export function createSessionOptions(
  customOptions?: SessionMiddlewareOptions
): SessionOptions {
  const secret = customOptions?.secret ?? config.sessionSecret;
  if (
    !secret ||
    (typeof secret === 'string' && secret.trim() === '') ||
    (Array.isArray(secret) && secret.length === 0)
  ) {
    throw new ConfigError(
      'Session secret is required when enabling session middleware. Provide `secret` in session options or set `SESSION_SECRET`.'
    );
  }

  const isProd = customOptions?.isProduction ?? config.isProduction;
  const {
    isProduction: _isProd,
    cookie: customCookie,
    ...rest
  } = customOptions ?? {};

  const cookie: SessionCookieOptions = {
    httpOnly: IS_DEFAULT_SESSION_COOKIE_HTTP_ONLY,
    maxAge: DEFAULT_SESSION_COOKIE_MAX_AGE,
    secure: isProd,
    ...customCookie,
  };

  return {
    resave: SHOULD_DEFAULT_SESSION_RESAVE,
    saveUninitialized: SHOULD_DEFAULT_SESSION_SAVE_UNINITIALIZED,
    ...rest,
    secret,
    cookie,
  };
}

/**
 * Creates `express-session` middleware configured with secure defaults.
 *
 * @param [options] - Session configuration options.
 * @returns Configured session RequestHandler.
 */
export function createSessionMiddleware(
  options?: SessionMiddlewareOptions
): RequestHandler {
  return session(createSessionOptions(options));
}
