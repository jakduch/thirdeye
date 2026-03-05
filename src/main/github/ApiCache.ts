/**
 * Two-level cache for GitHub API:
 *
 * 1. ETag-based conditional requests — GitHub returns 304 Not Modified
 *    and does NOT count it against rate limit.
 *
 * 2. In-memory cache keyed by URL — avoids re-fetching PR details,
 *    comments, check runs when nothing changed (based on updated_at).
 *
 * 3. Disk persistence — snapshot/restore for surviving app restarts.
 */

interface CacheEntry {
  etag: string | null;
  lastModified: string | null;
  data: any;
  timestamp: number;
}

export interface DiskCacheSnapshot {
  entries: Array<[string, CacheEntry]>;
  itemTimestamps: Array<[string, string]>;
  savedAt: number;
}

export class ApiCache {
  private entries = new Map<string, CacheEntry>();
  private itemTimestamps = new Map<string, string>();

  get(key: string): CacheEntry | null {
    return this.entries.get(key) || null;
  }

  set(key: string, data: any, etag: string | null, lastModified: string | null): void {
    this.entries.set(key, { etag, lastModified, data, timestamp: Date.now() });
  }

  needsDetailRefresh(owner: string, repo: string, number: number, updatedAt: string): boolean {
    const key = `${owner}/${repo}#${number}`;
    const prev = this.itemTimestamps.get(key);
    if (!prev || prev !== updatedAt) {
      this.itemTimestamps.set(key, updatedAt);
      return true;
    }
    return false;
  }

  setItemTimestamp(owner: string, repo: string, number: number, updatedAt: string): void {
    this.itemTimestamps.set(`${owner}/${repo}#${number}`, updatedAt);
  }

  getConditionalHeaders(key: string): Record<string, string> {
    const entry = this.entries.get(key);
    if (!entry) return {};
    const headers: Record<string, string> = {};
    if (entry.etag) headers['If-None-Match'] = entry.etag;
    if (entry.lastModified) headers['If-Modified-Since'] = entry.lastModified;
    return headers;
  }

  clear(): void {
    this.entries.clear();
    this.itemTimestamps.clear();
  }

  stats(): { entries: number; itemTimestamps: number } {
    return { entries: this.entries.size, itemTimestamps: this.itemTimestamps.size };
  }

  // ── Disk persistence ──

  /** Create a JSON-safe snapshot for saving to disk */
  snapshotForDisk(): DiskCacheSnapshot {
    return {
      entries: Array.from(this.entries.entries()),
      itemTimestamps: Array.from(this.itemTimestamps.entries()),
      savedAt: Date.now(),
    };
  }

  /** Restore cache from a disk snapshot. Skips entries older than maxAge (default 1h). */
  restoreFromDisk(snapshot: DiskCacheSnapshot, maxAgeMs: number = 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, entry] of snapshot.entries) {
      if (entry.timestamp > cutoff) {
        this.entries.set(key, entry);
      }
    }
    for (const [key, val] of snapshot.itemTimestamps) {
      this.itemTimestamps.set(key, val);
    }
  }
}
