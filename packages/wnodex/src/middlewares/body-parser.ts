/**
 * @file Body parsing middlewares for handling incoming JSON and URL-encoded payloads.
 * @module middlewares/body-parser
 */

import express, { type RequestHandler } from 'express';

import { config } from '../config/env.js';

/**
 * Options accepted by `express.json()`.
 */
export type JsonBodyParserOptions = NonNullable<
  Parameters<typeof express.json>[0]
>;

/**
 * Options accepted by `express.urlencoded()`.
 */
export type UrlencodedBodyParserOptions = NonNullable<
  Parameters<typeof express.urlencoded>[0]
>;

/**
 * Options for configuring JSON and URL-encoded body parsers.
 * Supports both top-level `limit`/`extended` overrides and granular `{ json, urlencoded }` options.
 */
export interface BodyParserOptions {
  /**
  Maximum request body size limit (e.g., '1mb', '5mb')
  */
  limit?: string | number;
  /**
  Whether to parse extended URL-encoded syntax (default: true)
  */
  extended?: boolean;
  /**
  Granular options forwarded directly to `express.json()`
  */
  json?: JsonBodyParserOptions;
  /**
  Granular options forwarded directly to `express.urlencoded()`
  */
  urlencoded?: UrlencodedBodyParserOptions;
}

/**
 * Creates middleware for parsing incoming JSON request bodies.
 *
 * @param [limitOrOptions] - Maximum body size limit string or BodyParserOptions.
 * @returns Express JSON parsing middleware.
 */
export function createJsonBodyParser(
  limitOrOptions?: string | BodyParserOptions
): RequestHandler {
  if (typeof limitOrOptions === 'string') {
    return express.json({ limit: limitOrOptions });
  }

  return express.json({
    limit: limitOrOptions?.limit ?? config.bodyLimit,
    ...limitOrOptions?.json,
  });
}

/**
 * Middleware for parsing incoming JSON request bodies using default settings.
 */
export const jsonBodyParser: RequestHandler = createJsonBodyParser();

/**
 * Creates middleware for parsing incoming URL-encoded form data.
 *
 * @param [limitOrOptions] - Maximum body size limit string or BodyParserOptions.
 * @returns Express URL-encoded parsing middleware.
 */
export function createUrlencodedBodyParser(
  limitOrOptions?: string | BodyParserOptions
): RequestHandler {
  if (typeof limitOrOptions === 'string') {
    return express.urlencoded({
      extended: true,
      limit: limitOrOptions,
    });
  }

  return express.urlencoded({
    extended: limitOrOptions?.extended ?? true,
    limit: limitOrOptions?.limit ?? config.bodyLimit,
    ...limitOrOptions?.urlencoded,
  });
}

/**
 * Middleware for parsing incoming URL-encoded form data using default settings.
 */
export const urlencodedBodyParser: RequestHandler =
  createUrlencodedBodyParser();

/**
 * Creates the combined array of standard body parser middlewares.
 *
 * @param [limitOrOptions] - Maximum body size limit string or BodyParserOptions.
 * @returns Array containing JSON and URL-encoded body parser handlers.
 */
export function createBodyParserMiddlewares(
  limitOrOptions?: string | BodyParserOptions
): RequestHandler[] {
  return [
    createJsonBodyParser(limitOrOptions),
    createUrlencodedBodyParser(limitOrOptions),
  ];
}

/**
 * Combined list of standard body parser middlewares using default configuration.
 */
export const bodyParserMiddlewares: RequestHandler[] =
  createBodyParserMiddlewares();
