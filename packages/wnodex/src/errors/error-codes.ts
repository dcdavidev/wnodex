/**
 * @file Standard machine-readable error codes for structured error handling.
 * @module errors/error-codes
 */

/**
 * Standardized error code constants.
 */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Union type of built-in error codes, extendable with custom strings.
 */
export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | (string & {});
