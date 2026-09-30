import { SubredditStream } from '../types/orbit';

const LOCAL_STORAGE_KEY = 'reddit_orbit_streams';

export type SyncDecision = 'use_local' | 'use_cloud' | 'merge';

export interface SyncAnalysisResult {
  hasConflict: boolean;
  localStreams: SubredditStream[];
  cloudStreams: SubredditStream[];
  cloudDashboardId: string | null;
  cloudDashboardName: string;
  localSummary: {
    count: number;
    subreddits: string[];
  };
  cloudSummary: {
    count: number;
    subreddits: string[];
  };
}

class DashboardSyncService {
  /**
   * Retrieves local dashboard streams from localStorage
   */
  getLocalStreams(): SubredditStream[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[SYNC] Error reading local streams from localStorage:', e);
    }
    return [];
  }

  /**
   * Saves streams to local localStorage
   */
  saveLocalStreams(streams: SubredditStream[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(streams));
    } catch (e) {
      console.warn('[SYNC] Error writing local streams to localStorage:', e);
    }
  }

  /**
   * Maps a backend MongoDB stream subdocument to frontend SubredditStream
   */
  convertCloudStreamToLocal(cloudStream: any, index: number): SubredditStream {
    const subName = (cloudStream.subreddit || '').toLowerCase().replace(/^r\//, '');
    return {
      id: cloudStream._id || `cloud-stream-${subName}-${Date.now()}-${index}`,
      name: subName,
      displayName: `r/${subName}`,
      tagline: `Community feed for r/${subName}`,
      subscribers: 0,
      activeUsers: 0,
      sort: cloudStream.sort || 'hot',
      timeRange: cloudStream.timeRange || 'day',
      postLimit: cloudStream.postLimit || 25,
      isCollapsed: Boolean(cloudStream.collapsed),
      isLoading: false,
      error: null,
      posts: [],
      lastSynced: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Maps a frontend SubredditStream to a backend MongoDB stream payload
   */
  convertLocalStreamToCloud(stream: SubredditStream, index: number): any {
    const cleanSub = stream.name.toLowerCase().replace(/^r\//, '');
    const streamObj: any = {
      subreddit: cleanSub,
      position: index,
      sort: stream.sort || 'hot',
      timeRange: stream.timeRange || 'day',
      postLimit: stream.postLimit || 25,
      collapsed: Boolean(stream.isCollapsed),
    };

    // If stream has a valid 24-char ObjectId from MongoDB, retain it
    if (stream.id && /^[0-9a-fA-F]{24}$/.test(stream.id)) {
      streamObj._id = stream.id;
    }
    return streamObj;
  }

  /**
   * Fetches the user's primary/active dashboard from Express & MongoDB
   */
  async fetchCloudDashboard(
    token: string
  ): Promise<{ dashboardId: string; name: string; streams: SubredditStream[] } | null> {
    try {
      const res = await fetch('/api/dashboards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch cloud dashboard (status ${res.status})`);
      }

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
        return null;
      }

      // Prioritize default dashboard, or take the most recently created
      const dashboards = json.data;
      const target = dashboards.find((d: any) => d.isDefault) || dashboards[0];

      const cloudStreams: SubredditStream[] = (target.streams || []).map(
        (cs: any, idx: number) => this.convertCloudStreamToLocal(cs, idx)
      );

      return {
        dashboardId: target._id,
        name: target.name,
        streams: cloudStreams,
      };
    } catch (err: any) {
      console.warn('[SYNC] Error fetching cloud dashboard:', err.message);
      return null;
    }
  }

  /**
   * Detects whether local streams and cloud streams are in conflict
   */
  detectConflicts(
    localStreams: SubredditStream[],
    cloudStreams: SubredditStream[]
  ): boolean {
    // If either side has streams while the other has none, or counts differ
    if (localStreams.length === 0 && cloudStreams.length === 0) {
      return false;
    }
    if (localStreams.length !== cloudStreams.length) {
      return true;
    }

    // Compare ordered subreddit names and sort configs
    for (let i = 0; i < localStreams.length; i++) {
      const local = localStreams[i];
      const cloud = cloudStreams[i];
      if (local.name.toLowerCase() !== cloud.name.toLowerCase()) {
        return true;
      }
      if (local.sort !== cloud.sort) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyzes the sync state between local and cloud configurations
   */
  async analyzeSync(
    localStreams: SubredditStream[],
    token: string
  ): Promise<SyncAnalysisResult> {
    const cloudData = await this.fetchCloudDashboard(token);
    const cloudStreams = cloudData?.streams || [];
    const cloudDashboardId = cloudData?.dashboardId || null;
    const cloudDashboardName = cloudData?.name || 'My Orbital Deck';

    const hasConflict = this.detectConflicts(localStreams, cloudStreams);

    return {
      hasConflict,
      localStreams,
      cloudStreams,
      cloudDashboardId,
      cloudDashboardName,
      localSummary: {
        count: localStreams.length,
        subreddits: localStreams.map((s) => s.name.toLowerCase()),
      },
      cloudSummary: {
        count: cloudStreams.length,
        subreddits: cloudStreams.map((s) => s.name.toLowerCase()),
      },
    };
  }

  /**
   * Merges local and cloud streams with deduplication:
   * Keeps cloud streams first, then appends any local streams not present in cloud.
   */
  mergeStreams(
    localStreams: SubredditStream[],
    cloudStreams: SubredditStream[]
  ): SubredditStream[] {
    const seenSubreddits = new Set<string>();
    const merged: SubredditStream[] = [];

    // 1. Add cloud streams
    for (const cs of cloudStreams) {
      const key = cs.name.toLowerCase();
      if (!seenSubreddits.has(key)) {
        seenSubreddits.add(key);
        merged.push(cs);
      }
    }

    // 2. Add local streams not already in cloud
    for (const ls of localStreams) {
      const key = ls.name.toLowerCase();
      if (!seenSubreddits.has(key)) {
        seenSubreddits.add(key);
        merged.push(ls);
      }
    }

    return merged;
  }

  /**
   * Saves the chosen configuration to Express/MongoDB Atlas
   */
  async saveCloudDashboard(
    dashboardId: string | null,
    name: string,
    streams: SubredditStream[],
    token: string
  ): Promise<string> {
    const cloudPayloadStreams = streams.map((s, idx) =>
      this.convertLocalStreamToCloud(s, idx)
    );

    if (dashboardId) {
      // Update existing dashboard
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          streams: cloudPayloadStreams,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update dashboard in MongoDB (status: ${res.status})`);
      }

      const json = await res.json();
      return json.data._id;
    } else {
      // Create new dashboard for user
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name || 'Synced Orbital Deck',
          streams: cloudPayloadStreams,
          isDefault: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create dashboard in MongoDB (status: ${res.status})`);
      }

      const json = await res.json();
      return json.data._id;
    }
  }

  /**
   * Resolves the sync decision, updates MongoDB, and returns the final streams array
   */
  async resolveSync(
    decision: SyncDecision,
    analysis: SyncAnalysisResult,
    token: string
  ): Promise<{ finalStreams: SubredditStream[]; dashboardId: string }> {
    let finalStreams: SubredditStream[] = [];

    switch (decision) {
      case 'use_local':
        finalStreams = analysis.localStreams;
        break;
      case 'use_cloud':
        finalStreams = analysis.cloudStreams;
        break;
      case 'merge':
        finalStreams = this.mergeStreams(analysis.localStreams, analysis.cloudStreams);
        break;
    }

    // Always persist final configuration to MongoDB Atlas
    const dashboardId = await this.saveCloudDashboard(
      analysis.cloudDashboardId,
      analysis.cloudDashboardName,
      finalStreams,
      token
    );

    // Synchronize localStorage
    this.saveLocalStreams(finalStreams);

    return {
      finalStreams,
      dashboardId,
    };
  }
}

export const dashboardSyncService = new DashboardSyncService();
