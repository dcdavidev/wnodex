/**
 * @file Cookie parsing middleware for populating `req.cookies` and `req.signedCookies`.
 * @module middlewares/cookie-parser
 */

import type { RequestHandler } from 'express';

import cookieParser, { type CookieParseOptions } from 'cookie-parser';

import { config } from '../config/env.js';

export type { CookieParseOptions } from 'cookie-parser';

/**
 * Options for configuring the cookie-parser middleware.
 */
export interface CookieParserOptions {
  /**
  Optional secret string or array of secrets used for signing and verifying cookies
  */
  secret?: string | string[];
  /**
  Optional cookie decoding and parsing options
  */
  options?: CookieParseOptions;
}

/**
 * Creates cookie-parser middleware with optional secret(s) and parsing options.
 *
 * @param [optionsOrSecret] - Optional CookieParserOptions, CookieParseOptions, or secret(s).
 * @returns Configured cookie-parser RequestHandler.
 */
export function createCookieParserMiddleware(
  optionsOrSecret?: CookieParserOptions | CookieParseOptions | string | string[]
): RequestHandler {
  if (typeof optionsOrSecret === 'string' || Array.isArray(optionsOrSecret)) {
    return cookieParser(optionsOrSecret);
  }

  if (
    optionsOrSecret &&
    ('secret' in optionsOrSecret || 'options' in optionsOrSecret)
  ) {
    const typed = optionsOrSecret;
    return cookieParser(typed.secret ?? config.cookieSecret, typed.options);
  }

  return cookieParser(
    config.cookieSecret,
    optionsOrSecret as CookieParseOptions | undefined
  );
}

/**
 * Default cookie-parser middleware instance.
 */
export const cookieParserMiddleware: RequestHandler =
  createCookieParserMiddleware();
