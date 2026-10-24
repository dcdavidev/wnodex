/**
 * @file Health check controllers coordinating diagnostic reports and probes.
 * @module health/health.controller
 */

import type { Request, Response } from 'express';

import {
  HealthModel,
  healthModel as defaultHealthModel,
} from './health.model.js';

/**
 * Controller managing health, liveness, and readiness HTTP endpoints.
 */
export class HealthController {
  /**
   * GET /health
   * Generates detailed service diagnostics and plugin health metrics.
   *
   * @param req - Express request object.
   * @param res - Express response object.
   */
  getHealth = async (req: Request, res: Response): Promise<void> => {
    const serviceName =
      (req.app.get('serviceName') as string | undefined) ??
      'Express Application';

    const report = await this.model.getDetailedHealth(serviceName, req.app);
    const statusCode = report.status === 'error' ? 503 : 200;

    res.status(statusCode).json(report);
  };

  /**
   * GET /health/live
   * Kubernetes liveness probe handler.
   *
   * @param _req - Express request object.
   * @param res - Express response object.
   */
  getLiveness = (_req: Request, res: Response): void => {
    const report = this.model.getLiveness();
    res.status(200).json(report);
  };

  /**
   * GET /health/ready
   * Kubernetes readiness probe handler checking memory and critical plugins.
   *
   * @param req - Express request object.
   * @param res - Express response object.
   */
  getReadiness = async (req: Request, res: Response): Promise<void> => {
    const { statusCode, report } = await this.model.getReadiness(req.app);
    res.status(statusCode).json(report);
  };

  /**
   * Initializes the health controller with a health model instance.
   *
   * @param [model] - Health model instance.
   */
  constructor(private readonly model: HealthModel = defaultHealthModel) {}
}

/**
 * Default singleton instance of HealthController.
 */
export const healthController = new HealthController();
