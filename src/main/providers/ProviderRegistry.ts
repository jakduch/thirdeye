import type { Account } from '../../shared/provider-types';
import { BaseProvider } from './BaseProvider';
import { GitHubProvider } from './github/GitHubProvider';
import { GitLabProvider } from './gitlab/GitLabProvider';
import { BitbucketProvider } from './bitbucket/BitbucketProvider';

/**
 * Registry that manages provider instances for all configured accounts.
 *
 * Usage:
 *   registry.add(account)    — create & store a provider
 *   registry.get(accountId)  — retrieve by ID
 *   registry.all()           — iterate all providers
 *   registry.remove(id)      — tear down & remove
 */
export class ProviderRegistry {
  private providers = new Map<string, BaseProvider>();

  /** Create a provider for the given account and register it */
  add(account: Account): BaseProvider {
    if (this.providers.has(account.id)) {
      this.providers.get(account.id)!.setToken(account.token);
      return this.providers.get(account.id)!;
    }
    const provider = ProviderRegistry.createProvider(account);
    this.providers.set(account.id, provider);
    return provider;
  }

  /** Look up provider by account ID */
  get(accountId: string): BaseProvider | undefined {
    return this.providers.get(accountId);
  }

  /** All active providers */
  all(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /** Remove provider and clear its cache */
  remove(accountId: string): void {
    const p = this.providers.get(accountId);
    if (p) {
      p.clearCache();
      this.providers.delete(accountId);
    }
  }

  /** Remove all providers */
  clear(): void {
    for (const p of this.providers.values()) p.clearCache();
    this.providers.clear();
  }

  /** Number of registered providers */
  get size(): number {
    return this.providers.size;
  }

  // ── Factory ──

  private static createProvider(account: Account): BaseProvider {
    switch (account.provider) {
      case 'github':
        return new GitHubProvider(account);
      case 'gitlab':
        return new GitLabProvider(account);
      case 'bitbucket':
        return new BitbucketProvider(account);
      default:
        throw new Error(`Unknown provider: ${(account as any).provider}`);
    }
  }
}
