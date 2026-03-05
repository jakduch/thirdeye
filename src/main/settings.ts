import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { DiskCacheSnapshot } from './github/ApiCache';

// electron-store is ESM-only since v9, use dynamic import
let storeInstance: any = null;

async function getStore(): Promise<any> {
  if (storeInstance) return storeInstance;
  const mod = await import('electron-store');
  const Store = mod.default;
  storeInstance = new Store({
    defaults: {
      settings: DEFAULT_SETTINGS,
      token: null as string | null,
      apiCache: null as DiskCacheSnapshot | null,
    },
  });
  return storeInstance;
}

export async function getSettings(): Promise<AppSettings> {
  const store = await getStore();
  const saved = store.get('settings') as AppSettings;
  // Merge with defaults for any new fields added in updates
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const store = await getStore();
  const current = await getSettings();
  const updated = { ...current, ...partial };
  store.set('settings', updated);
  return updated;
}

export async function getToken(): Promise<string | null> {
  const store = await getStore();
  return store.get('token') as string | null;
}

export async function setToken(token: string): Promise<void> {
  const store = await getStore();
  store.set('token', token);
}

export async function deleteToken(): Promise<void> {
  const store = await getStore();
  store.set('token', null);
}

export async function hasToken(): Promise<boolean> {
  const store = await getStore();
  return !!store.get('token');
}

// ── API Cache persistence ──

export async function getCache(): Promise<DiskCacheSnapshot | null> {
  const store = await getStore();
  return store.get('apiCache') as DiskCacheSnapshot | null;
}

export async function setCache(snapshot: DiskCacheSnapshot): Promise<void> {
  const store = await getStore();
  store.set('apiCache', snapshot);
}
