/**
 * @file Pure, reusable environment variable parsing utilities.
 * @module config/parsers
 */

const TRUTHY_ENV_VALUES = new Set(['true', '1', 'yes']);
const FALSY_ENV_VALUES = new Set(['false', '0', 'no']);

/**
 * Resolves a string value from an explicit override, an environment variable, or a fallback default.
 *
 * @param override - Explicit override value if provided.
 * @param envValue - Raw environment variable string.
 * @param fallback - Default value when neither override nor envValue is defined.
 * @returns The resolved string value.
 */
export function parseEnvString(
  override: string | undefined,
  envValue: string | undefined,
  fallback: string
): string {
  if (override !== undefined) {
    return override;
  }
  return envValue === undefined || envValue.trim() === '' ? fallback : envValue;
}

/**
 * Resolves an integer value from an explicit override, an environment variable, or a fallback default.
 * Safely falls back if the environment variable cannot be parsed as a valid integer.
 *
 * @param override - Explicit numerical override value if provided.
 * @param envValue - Raw environment variable string.
 * @param fallback - Default number when neither override nor valid envValue is available.
 * @returns The resolved integer value.
 */
export function parseEnvInt(
  override: number | undefined,
  envValue: string | undefined,
  fallback: number
): number {
  if (override !== undefined && !Number.isNaN(override)) {
    return override;
  }
  if (envValue !== undefined && envValue.trim() !== '') {
    const parsed = Math.trunc(Number(envValue));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * Resolves a boolean flag from an explicit override, an environment variable, or a fallback default.
 * Recognizes 'true', '1', 'yes' as true, and 'false', '0', 'no' as false.
 *
 * @param isOverrideEnabled - Explicit boolean override value if provided.
 * @param envValue - Raw environment variable string.
 * @param isFallbackEnabled - Default boolean when neither override nor valid envValue is available.
 * @returns True when the resolved flag is enabled, false otherwise.
 */
export function isEnvFlagEnabled(
  isOverrideEnabled: boolean | undefined,
  envValue: string | undefined,
  isFallbackEnabled: boolean
): boolean {
  if (isOverrideEnabled !== undefined) {
    return isOverrideEnabled;
  }
  if (envValue !== undefined) {
    const normalized = envValue.trim().toLowerCase();
    if (TRUTHY_ENV_VALUES.has(normalized)) {
      return true;
    }
    if (FALSY_ENV_VALUES.has(normalized)) {
      return false;
    }
  }
  return isFallbackEnabled;
}

/**
 * Resolves a string or comma-separated string list from an explicit override,
 * an environment variable, or a fallback default.
 *
 * @param override - Explicit string or string array override if provided.
 * @param envValue - Raw environment variable string (may be comma-separated).
 * @param fallback - Default value when neither override nor envValue is defined.
 * @returns A single string or array of trimmed strings.
 */
export function parseEnvOriginList(
  override: string | string[] | undefined,
  envValue: string | undefined,
  fallback: string
): string | string[] {
  if (override !== undefined) {
    return override;
  }
  const raw =
    envValue === undefined || envValue.trim() === '' ? fallback : envValue;
  return raw.includes(',')
    ? raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : raw;
}
