/**
 * @file Authentication middleware integrating Passport.js.
 * @module middlewares/passport
 */

import type { Application, RequestHandler } from 'express';

import passport, { type PassportStatic } from 'passport';

export type { PassportStatic } from 'passport';

/**
 * Configuration options for Passport.js middleware.
 */
export interface PassportMiddlewareOptions {
  /**
  Optional custom Passport authenticator instance (defaults to global `passport`)
  */
  instance?: PassportStatic;
  /**
  Whether to mount `passport.session()` alongside `passport.initialize()` (default: true)
  */
  session?: boolean;
}

/**
 * Resolves the active Passport instance and session flag from user options.
 *
 * @param [options] - Passport instance or options object.
 * @returns Resolved Passport authenticator and session toggle.
 */
function resolvePassportConfig(
  options?: PassportMiddlewareOptions | PassportStatic
): { authenticator: PassportStatic; useSession: boolean } {
  if (options && 'authenticate' in options) {
    return {
      authenticator: options,
      useSession: true,
    };
  }

  return {
    authenticator: options?.instance ?? passport,
    useSession: options?.session ?? true,
  };
}

/**
 * Creates the Passport initialization (and optional session) middleware handlers.
 *
 * @param [options] - Optional custom Passport instance or configuration options.
 * @returns Array of Express RequestHandlers for Passport.
 */
export function createPassportMiddlewares(
  options?: PassportMiddlewareOptions | PassportStatic
): RequestHandler[] {
  const { authenticator, useSession } = resolvePassportConfig(options);
  const middlewares: RequestHandler[] = [
    authenticator.initialize() as RequestHandler,
  ];

  if (useSession) {
    middlewares.push(authenticator.session() as RequestHandler);
  }

  return middlewares;
}

/**
 * Mounts Passport.js onto an Express application and stores the instance under `app.get('passport')`.
 *
 * @param app - Target Express application instance.
 * @param [options] - Optional boolean toggle, custom Passport instance, or PassportMiddlewareOptions.
 * @returns The configured Passport instance, or undefined if disabled.
 */
export function configurePassport(
  app: Application,
  options?: boolean | PassportMiddlewareOptions | PassportStatic
): PassportStatic | undefined {
  if (options === false) {
    return undefined;
  }

  const normalizedOptions = options === true ? undefined : options;
  const { authenticator } = resolvePassportConfig(normalizedOptions);

  app.set('passport', authenticator);
  for (const middleware of createPassportMiddlewares(normalizedOptions)) {
    app.use(middleware);
  }

  return authenticator;
}
