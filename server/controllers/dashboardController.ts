import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';

export class DashboardController {
  private getEffectiveUserId(req: Request): string {
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    return (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'guest_user';
  }

  /**
   * GET /api/dashboards
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.getEffectiveUserId(req);
      const dashboards = await dashboardService.listDashboards(userId);
      res.json({
        success: true,
        data: dashboards,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/dashboards/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = this.getEffectiveUserId(req);
      const dashboard = await dashboardService.getDashboardById(id, userId);
      res.json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/dashboards
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, streams, isDefault } = req.body;
      const userId = req.user?.userId || req.body.userId || 'guest_user';

      const dashboard = await dashboardService.createDashboard({
        name,
        userId,
        streams,
        isDefault,
      });

      res.status(201).json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/dashboards/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, streams, isDefault } = req.body;
      const userId = this.getEffectiveUserId(req);

      const dashboard = await dashboardService.updateDashboard(
        id,
        { name, streams, isDefault },
        userId
      );

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/dashboards/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = this.getEffectiveUserId(req);
      const result = await dashboardService.deleteDashboard(id, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/dashboards/:id/streams
   */
  async addStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const streamData = req.body;
      const userId = this.getEffectiveUserId(req);

      const dashboard = await dashboardService.addStream(id, streamData, userId);
      res.status(201).json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/dashboards/:id/streams/:streamId
   */
  async removeStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, streamId } = req.params;
      const userId = this.getEffectiveUserId(req);

      const dashboard = await dashboardService.removeStream(id, streamId, userId);
      res.json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
