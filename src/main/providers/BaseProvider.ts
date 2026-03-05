import type {
  ProviderType, Account,
  ProviderNotification, ProviderUserItem,
  ProviderIssueDetail, ProviderPRDetail,
  ProviderComment, ProviderCheckSuiteSummary,
  ProviderRateLimitInfo, ProviderRepo, ProviderLinkedItems,
} from '../../shared/provider-types';

/**
 * Abstract base class for all git-hosting providers.
 *
 * Each concrete provider (GitHub, GitLab, Bitbucket) implements these
 * methods to return provider-tagged data that the polling manager can
 * aggregate into a unified UI.
 */
export abstract class BaseProvider {
  readonly provider: ProviderType;
  readonly accountId: string;
  protected token: string;
  protected username: string | null = null;
  readonly instanceUrl: string | null;

  constructor(account: Account) {
    this.provider = account.provider;
    this.accountId = account.id;
    this.token = account.token;
    this.username = account.username || null;
    this.instanceUrl = account.instanceUrl || null;
  }

  /** Update the token at runtime (e.g. user re-authenticates) */
  setToken(token: string): void {
    this.token = token;
  }

  abstract getUsername(): Promise<string>;

  // ── List endpoints (used by polling) ──

  abstract getNotifications(since?: string): Promise<ProviderNotification[]>;
  abstract getMyPRs(): Promise<ProviderUserItem[]>;
  abstract getMyIssues(): Promise<ProviderUserItem[]>;

  // ── Detail endpoints ──

  abstract getIssueDetail(owner: string, repo: string, number: number): Promise<ProviderIssueDetail>;
  abstract getPRDetail(owner: string, repo: string, number: number): Promise<ProviderPRDetail>;
  abstract getComments(owner: string, repo: string, number: number): Promise<ProviderComment[]>;
  abstract postComment(owner: string, repo: string, number: number, body: string): Promise<ProviderComment>;

  // ── CI / Checks ──

  abstract getCheckRuns(owner: string, repo: string, ref: string): Promise<ProviderCheckSuiteSummary>;

  // ── Linked items (cross-references) ──

  abstract getLinkedItems(owner: string, repo: string, number: number): Promise<ProviderLinkedItems>;

  // ── Repos ──

  abstract getWatchedRepos(): Promise<ProviderRepo[]>;

  // ── Rate limit ──

  abstract getRateLimit(): Promise<ProviderRateLimitInfo>;

  // ── Notifications management ──

  abstract markAsRead(threadId: string): Promise<void>;
  abstract markAllAsRead(): Promise<void>;

  // ── Cache management (optional — providers can override) ──

  /** Snapshot cache for disk persistence */
  snapshotCache(): any { return null; }
  /** Restore cache from disk */
  restoreCache(_snapshot: any): void { /* no-op */ }
  /** Clear in-memory cache */
  clearCache(): void { /* no-op */ }
}
