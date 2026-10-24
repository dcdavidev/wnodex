/**
 * @file System, process, and memory diagnostics collection utilities.
 * @module health/system-metrics
 */

import os from 'node:os';
import process from 'node:process';

import {
  bytesToMegabytes,
  formatUptime,
  roundToTwoDecimals,
} from './formatters.js';

/**
 * Memory consumption metrics represented in megabytes.
 */
export interface MemoryStats {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
}

/**
 * Host operating system diagnostics.
 */
export interface SystemStats {
  loadAverage: number[];
  freeMemoryMb: number;
  totalMemoryMb: number;
  cpuCores: number;
}

/**
 * Node.js runtime process metadata.
 */
export interface ProcessStats {
  pid: number;
  nodeVersion: string;
  platform: string;
}

/**
 * Service uptime metrics.
 */
export interface UptimeStats {
  seconds: number;
  formatted: string;
}

/**
 * Collects current Node.js heap and RSS memory consumption in megabytes.
 *
 * @returns Memory statistics in megabytes.
 */
export function getMemoryStats(): MemoryStats {
  const mem = process.memoryUsage();
  return {
    heapUsedMb: bytesToMegabytes(mem.heapUsed),
    heapTotalMb: bytesToMegabytes(mem.heapTotal),
    rssMb: bytesToMegabytes(mem.rss),
    externalMb: bytesToMegabytes(mem.external),
  };
}

/**
 * Collects operating system metrics (load average, memory capacity, CPU core count).
 *
 * @returns System diagnostic statistics.
 */
export function getSystemStats(): SystemStats {
  return {
    loadAverage: os.loadavg().map((load) => roundToTwoDecimals(load)),
    freeMemoryMb: bytesToMegabytes(os.freemem()),
    totalMemoryMb: bytesToMegabytes(os.totalmem()),
    cpuCores: os.cpus().length,
  };
}

/**
 * Collects current process identifiers and platform information.
 *
 * @returns Process runtime statistics.
 */
export function getProcessStats(): ProcessStats {
  return {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
  };
}

/**
 * Collects uptime in seconds and formatted duration.
 *
 * @returns Uptime statistics.
 */
export function getUptimeStats(): UptimeStats {
  const seconds = Math.floor(process.uptime());
  return {
    seconds,
    formatted: formatUptime(seconds),
  };
}
