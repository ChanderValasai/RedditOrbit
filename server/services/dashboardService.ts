import { Dashboard, IDashboard } from '../models/Dashboard';
import { isDatabaseConnected } from '../db/connection';
import { AppError } from '../types';

/**
 * In-memory fallback storage used when MongoDB Atlas is offline or credentials are not yet configured.
 * Guarantees graceful operation without crashing or blocking development.
 */
class InMemoryDashboardStore {
  private dashboards = new Map<string, IDashboard>();

  constructor() {
    // Seed a default dashboard for guest users
    const defaultId = 'dash_default_dev';
    this.dashboards.set(defaultId, {
      _id: defaultId,
      name: 'Default Orbital Command',
      userId: 'guest_user',
      isDefault: true,
      streams: [
        {
          _id: 'str_1',
          subreddit: 'programming',
          position: 0,
          sort: 'hot',
          timeRange: 'day',
          postLimit: 25,
          collapsed: false,
        },
        {
          _id: 'str_2',
          subreddit: 'webdev',
          position: 1,
          sort: 'hot',
          timeRange: 'day',
          postLimit: 25,
          collapsed: false,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async list(userId: string): Promise<IDashboard[]> {
    return Array.from(this.dashboards.values()).filter(
      (d) => d.userId === userId || d.userId === 'guest_user'
    );
  }

  async get(id: string): Promise<IDashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async create(data: { name: string; userId: string; streams?: any[]; isDefault?: boolean }): Promise<IDashboard> {
    const id = `dash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newDash: IDashboard = {
      _id: id,
      name: data.name,
      userId: data.userId,
      isDefault: Boolean(data.isDefault),
      streams: (data.streams || []).map((s, idx) => ({
        _id: s._id || `str_${Date.now()}_${idx}`,
        subreddit: s.subreddit.toLowerCase().replace(/^r\//, ''),
        position: typeof s.position === 'number' ? s.position : idx,
        sort: s.sort || 'hot',
        timeRange: s.timeRange || 'day',
        postLimit: s.postLimit || 25,
        collapsed: Boolean(s.collapsed),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dashboards.set(id, newDash);
    return newDash;
  }

  async update(id: string, updates: any): Promise<IDashboard | null> {
    const existing = this.dashboards.get(id);
    if (!existing) return null;

    const updated: IDashboard = {
      ...existing,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.isDefault !== undefined ? { isDefault: updates.isDefault } : {}),
      ...(updates.streams ? {
        streams: updates.streams.map((s: any, idx: number) => ({
          _id: s._id || `str_${Date.now()}_${idx}`,
          subreddit: s.subreddit.toLowerCase().replace(/^r\//, ''),
          position: typeof s.position === 'number' ? s.position : idx,
          sort: s.sort || 'hot',
          timeRange: s.timeRange || 'day',
          postLimit: s.postLimit || 25,
          collapsed: Boolean(s.collapsed),
        }))
      } : {}),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.dashboards.delete(id);
  }
}

const memoryStore = new InMemoryDashboardStore();

export class DashboardService {
  /**
   * Retrieves list of dashboards for a user
   */
  async listDashboards(userId: string = 'guest_user'): Promise<IDashboard[]> {
    if (isDatabaseConnected()) {
      try {
        const docs = await Dashboard.find({ userId }).sort({ createdAt: -1 }).lean();
        return docs as unknown as IDashboard[];
      } catch (err: any) {
        console.warn(`[DATABASE] Query failed (${err.message}). Falling back to memory store.`);
      }
    }
    return memoryStore.list(userId);
  }

  /**
   * Retrieves a single dashboard by ID
   */
  async getDashboardById(id: string, userId?: string): Promise<IDashboard> {
    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: id };
        if (userId) query.userId = userId;
        const doc = await Dashboard.findOne(query).lean();
        if (doc) return doc as unknown as IDashboard;
      } catch (err: any) {
        console.warn(`[DATABASE] FindById query error (${err.message}). Checking memory fallback.`);
      }
    }

    const memoryDoc = await memoryStore.get(id);
    if (memoryDoc) {
      if (userId && memoryDoc.userId !== userId && memoryDoc.userId !== 'guest_user') {
        throw new AppError(403, 'FORBIDDEN', 'Access to this dashboard is restricted.');
      }
      return memoryDoc;
    }

    throw new AppError(404, 'NOT_FOUND', `Dashboard with ID '${id}' not found.`);
  }

  /**
   * Creates a new dashboard
   */
  async createDashboard(data: {
    name: string;
    userId?: string;
    streams?: any[];
    isDefault?: boolean;
  }): Promise<IDashboard> {
    const userId = data.userId || 'guest_user';

    if (!data.name || data.name.trim().length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Dashboard name is required.');
    }

    if (isDatabaseConnected()) {
      try {
        // Strip non-ObjectId string IDs before passing to Mongoose subdocuments
        const sanitizedStreams = (data.streams || []).map((s: any, idx: number) => {
          const streamObj: any = {
            subreddit: s.subreddit.toLowerCase().replace(/^r\//, '').trim(),
            position: typeof s.position === 'number' ? s.position : idx,
            sort: s.sort || 'hot',
            timeRange: s.timeRange || 'day',
            postLimit: s.postLimit || 25,
            collapsed: Boolean(s.collapsed),
          };
          if (s._id && typeof s._id === 'string' && /^[0-9a-fA-F]{24}$/.test(s._id)) {
            streamObj._id = s._id;
          }
          return streamObj;
        });

        const doc = await Dashboard.create({
          name: data.name.trim(),
          userId,
          streams: sanitizedStreams,
          isDefault: Boolean(data.isDefault),
        });
        return doc.toObject() as unknown as IDashboard;
      } catch (err: any) {
        console.warn(`[DATABASE] Create failed (${err.message}). Storing in memory fallback.`);
      }
    }

    return memoryStore.create({
      name: data.name.trim(),
      userId,
      streams: data.streams,
      isDefault: data.isDefault,
    });
  }

  /**
   * Updates an existing dashboard
   */
  async updateDashboard(
    id: string,
    updates: Partial<{ name: string; streams: any[]; isDefault: boolean }>,
    userId?: string
  ): Promise<IDashboard> {
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Dashboard name cannot be empty.');
    }

    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: id };
        if (userId) query.userId = userId;

        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name.trim();
        if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
        if (updates.streams !== undefined) {
          updateData.streams = updates.streams.map((s: any, idx: number) => {
            const streamObj: any = {
              subreddit: s.subreddit.toLowerCase().replace(/^r\//, '').trim(),
              position: typeof s.position === 'number' ? s.position : idx,
              sort: s.sort || 'hot',
              timeRange: s.timeRange || 'day',
              postLimit: s.postLimit || 25,
              collapsed: Boolean(s.collapsed),
            };
            if (s._id && typeof s._id === 'string' && /^[0-9a-fA-F]{24}$/.test(s._id)) {
              streamObj._id = s._id;
            }
            return streamObj;
          });
        }

        const updated = await Dashboard.findOneAndUpdate(query, updateData, {
          new: true,
          runValidators: true,
        }).lean();

        if (updated) return updated as unknown as IDashboard;
      } catch (err: any) {
        console.warn(`[DATABASE] Update query failed (${err.message}). Attempting memory update.`);
      }
    }

    const memoryUpdated = await memoryStore.update(id, updates);
    if (!memoryUpdated) {
      throw new AppError(404, 'NOT_FOUND', `Dashboard with ID '${id}' not found.`);
    }

    return memoryUpdated;
  }

  /**
   * Deletes a dashboard
   */
  async deleteDashboard(id: string, userId?: string): Promise<{ success: boolean; id: string }> {
    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: id };
        if (userId) query.userId = userId;
        const res = await Dashboard.findOneAndDelete(query);
        if (res) return { success: true, id };
      } catch (err: any) {
        console.warn(`[DATABASE] Delete query failed (${err.message}). Checking memory fallback.`);
      }
    }

    const deleted = await memoryStore.delete(id);
    if (!deleted) {
      throw new AppError(404, 'NOT_FOUND', `Dashboard with ID '${id}' not found.`);
    }

    return { success: true, id };
  }

  /**
   * Adds a stream to a dashboard using atomic MongoDB $push when connected
   */
  async addStream(
    dashboardId: string,
    streamData: {
      subreddit: string;
      position?: number;
      sort?: string;
      timeRange?: string;
      postLimit?: number;
      collapsed?: boolean;
    },
    userId?: string
  ): Promise<IDashboard> {
    if (!streamData.subreddit || streamData.subreddit.trim().length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Subreddit is required for stream.');
    }

    const cleanSub = streamData.subreddit.trim().toLowerCase().replace(/^r\//, '');

    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: dashboardId };
        if (userId) query.userId = userId;

        const newStreamDoc: any = {
          subreddit: cleanSub,
          sort: streamData.sort || 'hot',
          timeRange: streamData.timeRange || 'day',
          postLimit: streamData.postLimit || 25,
          collapsed: Boolean(streamData.collapsed),
        };
        if (typeof streamData.position === 'number') {
          newStreamDoc.position = streamData.position;
        }

        const updated = await Dashboard.findOneAndUpdate(
          query,
          { $push: { streams: newStreamDoc } },
          { new: true, runValidators: true }
        ).lean();

        if (updated) return updated as unknown as IDashboard;
      } catch (err: any) {
        console.warn(`[DATABASE] AddStream query failed (${err.message}).`);
      }
    }

    const dashboard = await this.getDashboardById(dashboardId, userId);
    const streams = [...(dashboard.streams || [])];
    const newStream = {
      _id: `str_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      subreddit: cleanSub,
      position: typeof streamData.position === 'number' ? streamData.position : streams.length,
      sort: (streamData.sort as any) || 'hot',
      timeRange: (streamData.timeRange as any) || 'day',
      postLimit: streamData.postLimit || 25,
      collapsed: Boolean(streamData.collapsed),
    };

    streams.push(newStream);
    return this.updateDashboard(dashboardId, { streams }, userId);
  }

  /**
   * Removes a stream from a dashboard using atomic MongoDB $pull when connected
   */
  async removeStream(dashboardId: string, streamId: string, userId?: string): Promise<IDashboard> {
    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: dashboardId };
        if (userId) query.userId = userId;

        const updated = await Dashboard.findOneAndUpdate(
          query,
          { $pull: { streams: { _id: streamId } } },
          { new: true }
        ).lean();

        if (updated) return updated as unknown as IDashboard;
      } catch (err: any) {
        console.warn(`[DATABASE] RemoveStream query failed (${err.message}).`);
      }
    }

    const dashboard = await this.getDashboardById(dashboardId, userId);
    const initialCount = dashboard.streams.length;
    const streams = dashboard.streams.filter((s: any) => String(s._id) !== String(streamId));

    if (streams.length === initialCount) {
      throw new AppError(404, 'NOT_FOUND', `Stream with ID '${streamId}' not found in dashboard.`);
    }

    return this.updateDashboard(dashboardId, { streams }, userId);
  }
}

export const dashboardService = new DashboardService();
