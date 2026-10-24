/**
 * @file Static assets middleware helper for serving immutable `/static` bundles and root files.
 * @module middlewares/static
 */

import path from 'node:path';

import express, { type Application, type RequestHandler } from 'express';

import {
  DEFAULT_IMMUTABLE_STATIC_MAX_AGE,
  DEFAULT_STATIC_MAX_AGE,
} from '../constants/index.js';

/**
 * Options for configuring static asset serving.
 */
export interface StaticAssetsOptions {
  /**
  Root directory of the client build (containing the `static` subfolder or static files)
  */
  clientRoot: string;
  /**
  Subdirectory name for immutable hashed assets (default: 'static')
  */
  staticSubdir?: string;
  /**
  URL mount prefix for immutable assets (default: '/static')
  */
  staticUrlPrefix?: string;
  /**
  Cache-Control maxAge for immutable assets (default: '1y')
  */
  immutableMaxAge?: string | number;
  /**
  Cache-Control maxAge for root files (default: '1h')
  */
  rootMaxAge?: string | number;
}

/**
 * Registers static file serving middlewares on an Express application.
 * Serves `/static` with `immutable: true` and `1y` max-age, plus `clientRoot` with `1h` max-age.
 *
 * @param app - Express application instance.
 * @param optionsOrClientRoot - StaticAssetsOptions or client root directory path.
 */
export function registerStaticAssets(
  app: Application,
  optionsOrClientRoot: string | StaticAssetsOptions
): void {
  const options: StaticAssetsOptions =
    typeof optionsOrClientRoot === 'string'
      ? { clientRoot: optionsOrClientRoot }
      : optionsOrClientRoot;

  const staticSubdir = options.staticSubdir ?? 'static';
  const staticUrlPrefix = options.staticUrlPrefix ?? '/static';
  const staticDir = path.join(options.clientRoot, staticSubdir);

  app.use(
    staticUrlPrefix,
    express.static(staticDir, {
      immutable: true,
      maxAge: options.immutableMaxAge ?? DEFAULT_IMMUTABLE_STATIC_MAX_AGE,
      fallthrough: false,
    }) as RequestHandler
  );

  app.use(
    express.static(options.clientRoot, {
      maxAge: options.rootMaxAge ?? DEFAULT_STATIC_MAX_AGE,
    }) as RequestHandler
  );
}

/**
 * Namespace-compatible static assets helper (matching `@wnodex/react-router`'s `StaticAssets.register`).
 */
export const StaticAssets = {
  register: registerStaticAssets,
};
