/**
 * @file String and metric formatting utility functions.
 * @module health/formatters
 */

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Rounds a floating-point number to 2 decimal places.
 *
 * @param value - Numerical value to round.
 * @returns Value rounded to two decimal places.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Converts a byte count into megabytes rounded to 2 decimal places.
 *
 * @param bytes - Memory size in bytes.
 * @returns Size in megabytes rounded to two decimal places.
 */
export function bytesToMegabytes(bytes: number): number {
  return roundToTwoDecimals(bytes / BYTES_PER_MEGABYTE);
}

/**
 * Formats a duration in seconds into a human-readable duration string.
 *
 * @param seconds - Duration in seconds.
 * @returns Formatted duration string (e.g., "1d 2h 3m 4s").
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}
