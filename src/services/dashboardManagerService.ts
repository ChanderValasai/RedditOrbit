import { SubredditStream, UserDashboard } from '../types/orbit';
import { PRESET_DASHBOARDS, INITIAL_STREAMS } from '../data/mockStreams';
import { dashboardSyncService } from './dashboardSyncService';

const LOCAL_DASHBOARDS_KEY = 'reddit_orbit_user_dashboards';
const ACTIVE_DASHBOARD_ID_KEY = 'reddit_orbit_active_dashboard_id';

class DashboardManagerService {
  /**
   * Initializes default local dashboards for guest session if not yet present
   */
  private getDefaultLocalDashboards(): UserDashboard[] {
    return PRESET_DASHBOARDS.map((preset, index) => {
      const streams = INITIAL_STREAMS.filter((s) => preset.streamNames.includes(s.name));
      return {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        streams: streams.length > 0 ? streams : INITIAL_STREAMS,
        isDefault: index === 0,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Gets local dashboards from localStorage
   */
  getLocalDashboards(): UserDashboard[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(LOCAL_DASHBOARDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[DASHBOARD_MGR] Error parsing local dashboards:', e);
    }
    const defaults = this.getDefaultLocalDashboards();
    this.saveLocalDashboards(defaults);
    return defaults;
  }

  /**
   * Saves local dashboards to localStorage
   */
  saveLocalDashboards(dashboards: UserDashboard[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_DASHBOARDS_KEY, JSON.stringify(dashboards));
    } catch (e) {
      console.warn('[DASHBOARD_MGR] Error saving local dashboards:', e);
    }
  }

  /**
   * Gets stored active dashboard ID
   */
  getActiveDashboardId(): string {
    if (typeof window === 'undefined') return 'core-engineering';
    return localStorage.getItem(ACTIVE_DASHBOARD_ID_KEY) || 'core-engineering';
  }

  /**
   * Sets stored active dashboard ID
   */
  setActiveDashboardId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_DASHBOARD_ID_KEY, id);
  }

  /**
   * Lists all dashboards: from MongoDB if token present, or localStorage if anonymous
   */
  async listDashboards(token?: string | null): Promise<UserDashboard[]> {
    if (token) {
      try {
        const res = await fetch('/api/dashboards', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            return json.data.map((doc: any) => ({
              id: doc._id,
              name: doc.name,
              description: doc.description || `Cloud Workspace (${(doc.streams || []).length} streams)`,
              streams: (doc.streams || []).map((cs: any, idx: number) =>
                dashboardSyncService.convertCloudStreamToLocal(cs, idx)
              ),
              isDefault: Boolean(doc.isDefault),
              createdAt: doc.createdAt,
              userId: doc.userId,
            }));
          }
        }
      } catch (err: any) {
        console.warn('[DASHBOARD_MGR] Cloud list failed, falling back to local:', err.message);
      }
    }

    return this.getLocalDashboards();
  }

  /**
   * Creates a new dashboard
   */
  async createDashboard(
    name: string,
    streams: SubredditStream[] = [],
    token?: string | null
  ): Promise<UserDashboard> {
    const trimmedName = name.trim() || 'New Orbital Deck';

    if (token) {
      try {
        const cloudPayload = streams.map((s, idx) =>
          dashboardSyncService.convertLocalStreamToCloud(s, idx)
        );

        const res = await fetch('/api/dashboards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: trimmedName,
            streams: cloudPayload,
            isDefault: false,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const doc = json.data;
          const newDash: UserDashboard = {
            id: doc._id,
            name: doc.name,
            description: `Custom Workspace (${streams.length} streams)`,
            streams,
            isDefault: false,
            createdAt: doc.createdAt,
            userId: doc.userId,
          };
          return newDash;
        }
      } catch (err: any) {
        console.warn('[DASHBOARD_MGR] Cloud create failed, saving locally:', err.message);
      }
    }

    // Local fallback / anonymous
    const localDashboards = this.getLocalDashboards();
    const newDash: UserDashboard = {
      id: `local-dash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      description: `Local Workspace (${streams.length} streams)`,
      streams,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    localDashboards.push(newDash);
    this.saveLocalDashboards(localDashboards);
    return newDash;
  }

  /**
   * Updates an existing dashboard (name, streams, default status)
   */
  async updateDashboard(
    id: string,
    updates: Partial<{ name: string; streams: SubredditStream[]; isDefault: boolean }>,
    token?: string | null
  ): Promise<UserDashboard> {
    if (token && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name.trim();
        if (updates.isDefault !== undefined) payload.isDefault = updates.isDefault;
        if (updates.streams !== undefined) {
          payload.streams = updates.streams.map((s, idx) =>
            dashboardSyncService.convertLocalStreamToCloud(s, idx)
          );
        }

        const res = await fetch(`/api/dashboards/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const doc = json.data;
          return {
            id: doc._id,
            name: doc.name,
            description: doc.description,
            streams: (doc.streams || []).map((cs: any, idx: number) =>
              dashboardSyncService.convertCloudStreamToLocal(cs, idx)
            ),
            isDefault: Boolean(doc.isDefault),
            createdAt: doc.createdAt,
            userId: doc.userId,
          };
        }
      } catch (err: any) {
        console.warn('[DASHBOARD_MGR] Cloud update failed:', err.message);
      }
    }

    // Local update
    const localDashboards = this.getLocalDashboards();
    const index = localDashboards.findIndex((d) => d.id === id);
    if (index !== -1) {
      const updated: UserDashboard = {
        ...localDashboards[index],
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(updates.streams !== undefined ? { streams: updates.streams } : {}),
        ...(updates.isDefault !== undefined ? { isDefault: updates.isDefault } : {}),
      };
      localDashboards[index] = updated;
      this.saveLocalDashboards(localDashboards);
      return updated;
    }

    // If ID was a preset
    const preset = PRESET_DASHBOARDS.find((p) => p.id === id);
    const fallback: UserDashboard = {
      id,
      name: updates.name || preset?.name || 'Workspace',
      streams: updates.streams || [],
      isDefault: false,
    };
    return fallback;
  }

  /**
   * Deletes a dashboard
   */
  async deleteDashboard(id: string, token?: string | null): Promise<boolean> {
    if (token && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        const res = await fetch(`/api/dashboards/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) return true;
      } catch (err: any) {
        console.warn('[DASHBOARD_MGR] Cloud delete failed:', err.message);
      }
    }

    const localDashboards = this.getLocalDashboards();
    const filtered = localDashboards.filter((d) => d.id !== id);
    this.saveLocalDashboards(filtered);
    return true;
  }
}

export const dashboardManagerService = new DashboardManagerService();
