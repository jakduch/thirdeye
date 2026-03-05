import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { Account } from '../shared/provider-types';
import type { DiskCacheSnapshot } from './providers/github/ApiCache';

// electron-store is ESM-only since v9, use dynamic import
let storeInstance: any = null;

async function getStore(): Promise<any> {
  if (storeInstance) return storeInstance;
  const mod = await import('electron-store');
  const Store = mod.default;
  storeInstance = new Store({
    defaults: {
      settings: DEFAULT_SETTINGS,
      token: null as string | null,         // legacy single-account token
      accounts: [] as Account[],
      apiCache: null as DiskCacheSnapshot | null,
      providerCaches: {} as Record<string, any>,
    },
  });
  return storeInstance;
}

// ── Migration: old single token → first GitHub account ──

export async function migrateIfNeeded(): Promise<void> {
  const store = await getStore();
  const token = store.get('token') as string | null;
  const accounts = store.get('accounts') as Account[];

  if (token && (!accounts || accounts.length === 0)) {
    const migrated: Account = {
      id: generateId(),
      provider: 'github',
      displayName: 'GitHub',
      token,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    store.set('accounts', [migrated]);

    // Move old apiCache into providerCaches keyed by new account ID
    const oldCache = store.get('apiCache') as DiskCacheSnapshot | null;
    if (oldCache) {
      store.set('providerCaches', { [migrated.id]: oldCache });
    }
    store.set('token', null);
    store.set('apiCache', null);
    console.log('[settings] Migrated single GitHub token to account:', migrated.id);
  }
}

// ── Settings ──

export async function getSettings(): Promise<AppSettings> {
  const store = await getStore();
  const saved = store.get('settings') as AppSettings;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const store = await getStore();
  const current = await getSettings();
  const updated = { ...current, ...partial };
  store.set('settings', updated);
  return updated;
}

// ── Legacy token (kept for backward compat) ──

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
  const accounts = store.get('accounts') as Account[];
  if (accounts && accounts.length > 0) return true;
  return !!store.get('token');
}

// ── Account Management ──

export async function getAccounts(): Promise<Account[]> {
  const store = await getStore();
  return (store.get('accounts') as Account[]) || [];
}

export async function addAccount(account: Account): Promise<Account[]> {
  const store = await getStore();
  const accounts = await getAccounts();
  accounts.push(account);
  store.set('accounts', accounts);
  return accounts;
}

export async function removeAccount(accountId: string): Promise<Account[]> {
  const store = await getStore();
  const accounts = (await getAccounts()).filter(a => a.id !== accountId);
  store.set('accounts', accounts);
  const caches = (store.get('providerCaches') || {}) as Record<string, any>;
  delete caches[accountId];
  store.set('providerCaches', caches);
  return accounts;
}

export async function updateAccount(accountId: string, partial: Partial<Account>): Promise<Account[]> {
  const store = await getStore();
  const accounts = await getAccounts();
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...partial };
    store.set('accounts', accounts);
  }
  return accounts;
}

// ── Per-account Cache persistence ──

export async function getProviderCache(accountId: string): Promise<any | null> {
  const store = await getStore();
  const caches = (store.get('providerCaches') || {}) as Record<string, any>;
  return caches[accountId] || null;
}

export async function setProviderCache(accountId: string, snapshot: any): Promise<void> {
  const store = await getStore();
  const caches = (store.get('providerCaches') || {}) as Record<string, any>;
  caches[accountId] = snapshot;
  store.set('providerCaches', caches);
}

export async function getAllProviderCaches(): Promise<Record<string, any>> {
  const store = await getStore();
  return (store.get('providerCaches') || {}) as Record<string, any>;
}

export async function setAllProviderCaches(caches: Record<string, any>): Promise<void> {
  const store = await getStore();
  store.set('providerCaches', caches);
}

// ── Legacy API Cache persistence ──

export async function getCache(): Promise<DiskCacheSnapshot | null> {
  const store = await getStore();
  return store.get('apiCache') as DiskCacheSnapshot | null;
}

export async function setCache(snapshot: DiskCacheSnapshot): Promise<void> {
  const store = await getStore();
  store.set('apiCache', snapshot);
}

// ── Helpers ──

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export { generateId };
