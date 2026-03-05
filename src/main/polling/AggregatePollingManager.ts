import { BrowserWindow } from 'electron';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { BaseProvider } from '../providers/BaseProvider';
import { IPC } from '../../shared/ipc-channels';
import type {
  ProviderNotification, ProviderUserItem, ProviderActivityEvent,
  ProviderRateLimitInfo, Account,
} from '../../shared/provider-types';
import type { AppSettings } from '../../shared/types';

interface ItemState {
  state: string;
  comments: number;
  merged?: boolean;
}

/**
 * Polls all registered providers in parallel and aggregates results
 * into unified lists for the renderer.
 */
export class AggregatePollingManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPoll = new Map<string, string>(); // accountId → ISO timestamp

  // Aggregated state
  private notifications: ProviderNotification[] = [];
  private myPRs: ProviderUserItem[] = [];
  private myIssues: ProviderUserItem[] = [];

  // Per-account state caches for change detection
  private itemStateCache = new Map<string, ItemState>(); // "accountId:type:id" → state
  private knownItemIds = new Set<string>(); // "accountId:type:id"
  private checkCache = new Map<string, Map<string, string | null>>(); // "accountId:repo#number" → Map<checkName, conclusion>
  private isFirstPoll = new Map<string, boolean>(); // accountId → boolean

  constructor(
    private registry: ProviderRegistry,
    private getMainWindow: () => BrowserWindow | null,
    private onNotificationsUpdate: (notifications: ProviderNotification[]) => void,
    private onActivity: (event: ProviderActivityEvent) => void,
    private getSettings: () => Promise<AppSettings>,
  ) {}

  /** Initialize/update providers from account list */
  initializeAccounts(accounts: Account[]): void {
    const activeIds = new Set<string>();
    for (const account of accounts) {
      if (!account.enabled) continue;
      activeIds.add(account.id);
      this.registry.add(account);
      if (!this.isFirstPoll.has(account.id)) {
        this.isFirstPoll.set(account.id, true);
      }
    }
    // Remove providers for deleted/disabled accounts
    for (const provider of this.registry.all()) {
      if (!activeIds.has(provider.accountId)) {
        this.registry.remove(provider.accountId);
        this.isFirstPoll.delete(provider.accountId);
        this.lastPoll.delete(provider.accountId);
      }
    }
  }

  start(intervalSeconds: number): void {
    this.stop();
    this.poll();
    this.timer = setInterval(() => this.poll(), intervalSeconds * 1000);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private shouldIncludeRepo(repo: string, settings: AppSettings): boolean {
    const ignored = settings.ignoredRepos || [];
    const watched = settings.watchedRepos || [];
    if (ignored.length > 0 && ignored.includes(repo)) return false;
    if (watched.length > 0) return watched.includes(repo);
    return true;
  }

  async poll(): Promise<void> {
    const win = this.getMainWindow();
    const settings = await this.getSettings();
    const providers = this.registry.all();
    if (providers.length === 0) return;

    // Poll all providers in parallel
    const results = await Promise.allSettled(
      providers.map(p => this.pollProvider(p, settings))
    );

    // Log errors
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.error(`[polling] Error from ${providers[i].provider}/${providers[i].accountId}:`, (results[i] as PromiseRejectedResult).reason);
      }
    }

    // Aggregate from all successful results
    this.aggregateResults(settings);

    // Send to renderer
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.NOTIFICATIONS_UPDATED, this.notifications);
      win.webContents.send(IPC.MY_PRS_UPDATED, this.myPRs);
      win.webContents.send(IPC.MY_ISSUES_UPDATED, this.myIssues);
    }

    this.onNotificationsUpdate(this.notifications);

    // Rate limits from all providers
    const rateLimits = await this.getAllRateLimits();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.RATE_LIMIT_INFO, rateLimits);
    }
  }

  // Per-account accumulators (rebuilt each poll)
  private perAccountNotifs = new Map<string, ProviderNotification[]>();
  private perAccountPRs = new Map<string, ProviderUserItem[]>();
  private perAccountIssues = new Map<string, ProviderUserItem[]>();

  private async pollProvider(provider: BaseProvider, settings: AppSettings): Promise<void> {
    const aid = provider.accountId;
    const since = this.lastPoll.get(aid) || undefined;

    const [notifResult, prsResult, issuesResult] = await Promise.allSettled([
      provider.getNotifications(since),
      provider.getMyPRs(),
      provider.getMyIssues(),
    ]);

    this.lastPoll.set(aid, new Date().toISOString());

    // Notifications
    if (notifResult.status === 'fulfilled') {
      const existing = new Map((this.perAccountNotifs.get(aid) || []).map(n => [n.id, n]));
      for (const n of notifResult.value) existing.set(n.id, n);
      const filtered = Array.from(existing.values())
        .filter(n => this.shouldIncludeRepo(n.repository.full_name, settings))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      this.perAccountNotifs.set(aid, filtered);
    }

    // PRs
    if (prsResult.status === 'fulfilled') {
      const filtered = prsResult.value.filter(p => this.shouldIncludeRepo(p.repository.full_name, settings));
      const firstPoll = this.isFirstPoll.get(aid) ?? true;
      if (!firstPoll) {
        this.detectItemChanges(aid, filtered, 'pr');
      } else {
        for (const pr of filtered) {
          const key = `${aid}:pr:${pr.id}`;
          this.knownItemIds.add(key);
          this.itemStateCache.set(key, { state: pr.state, comments: pr.comments, merged: pr.merged });
        }
      }
      this.perAccountPRs.set(aid, filtered);

      // Check runs for open PRs
      await this.pollCheckRuns(provider, filtered.filter(pr => pr.state === 'open'));
    }

    // Issues
    if (issuesResult.status === 'fulfilled') {
      const filtered = issuesResult.value.filter(i => this.shouldIncludeRepo(i.repository.full_name, settings));
      const firstPoll = this.isFirstPoll.get(aid) ?? true;
      if (!firstPoll) {
        this.detectItemChanges(aid, filtered, 'issue');
      } else {
        for (const issue of filtered) {
          const key = `${aid}:issue:${issue.id}`;
          this.knownItemIds.add(key);
          this.itemStateCache.set(key, { state: issue.state, comments: issue.comments });
        }
      }
      this.perAccountIssues.set(aid, filtered);
    }

    this.isFirstPoll.set(aid, false);
  }

  private aggregateResults(_settings: AppSettings): void {
    // Merge all per-account results
    this.notifications = Array.from(this.perAccountNotifs.values()).flat()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    this.myPRs = Array.from(this.perAccountPRs.values()).flat()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    this.myIssues = Array.from(this.perAccountIssues.values()).flat()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  private detectItemChanges(accountId: string, items: ProviderUserItem[], type: 'pr' | 'issue' | 'mr'): void {
    for (const item of items) {
      const key = `${accountId}:${type}:${item.id}`;
      const prev = this.itemStateCache.get(key);

      if (!this.knownItemIds.has(key)) {
        this.knownItemIds.add(key);
        const eventType = type === 'pr' || type === 'mr' ? 'new_pr' : 'new_issue';
        const label = type === 'mr' ? 'MR' : type === 'pr' ? 'PR' : 'Issue';
        this.onActivity({
          provider: item.provider, accountId,
          type: type === 'mr' ? 'new_mr' : eventType,
          title: `New ${label}: ${item.repository.name}#${item.number}`,
          body: item.title, url: item.html_url,
          repo: item.repository.full_name, number: item.number,
        });
      } else if (prev) {
        if ((type === 'pr' || type === 'mr') && item.merged && !prev.merged) {
          this.onActivity({
            provider: item.provider, accountId,
            type: 'merged',
            title: `Merged: ${item.repository.name}#${item.number}`,
            body: item.title, url: item.html_url,
            repo: item.repository.full_name, number: item.number,
          });
        } else if (prev.state !== item.state) {
          this.onActivity({
            provider: item.provider, accountId,
            type: 'state_change',
            title: `${item.state === 'closed' ? 'Closed' : 'Reopened'}: ${item.repository.name}#${item.number}`,
            body: item.title, url: item.html_url,
            repo: item.repository.full_name, number: item.number,
          });
        }
        if (item.comments > prev.comments) {
          const n = item.comments - prev.comments;
          this.onActivity({
            provider: item.provider, accountId,
            type: 'new_comment',
            title: `${n} new comment${n > 1 ? 's' : ''}: ${item.repository.name}#${item.number}`,
            body: item.title, url: item.html_url,
            repo: item.repository.full_name, number: item.number,
          });
        }
      }

      this.itemStateCache.set(key, { state: item.state, comments: item.comments, merged: item.merged });
    }
  }

  private async pollCheckRuns(provider: BaseProvider, openPRs: ProviderUserItem[]): Promise<void> {
    const win = this.getMainWindow();
    const aid = provider.accountId;
    for (const pr of openPRs) {
      try {
        const detail = await provider.getPRDetail(pr.repository.owner, pr.repository.name, pr.number);
        const checks = await provider.getCheckRuns(pr.repository.owner, pr.repository.name, detail.head.sha);
        pr.checks = checks;

        const cacheKey = `${aid}:${pr.repository.full_name}#${pr.number}`;
        const prevChecks = this.checkCache.get(cacheKey) || new Map();
        const newChecks = new Map<string, string | null>();

        for (const run of checks.runs) {
          newChecks.set(run.name, run.conclusion);
          const prev = prevChecks.get(run.name);
          if (prev !== undefined && prev !== run.conclusion && run.status === 'completed' && run.conclusion) {
            if (win && !win.isDestroyed()) {
              win.webContents.send(IPC.CHECK_STATUS_CHANGED, {
                prNumber: pr.number, prTitle: pr.title, repo: pr.repository.full_name,
                checkName: run.name, conclusion: run.conclusion, html_url: run.html_url,
              });
            }
            const icon = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⚠️';
            this.onActivity({
              provider: pr.provider, accountId: aid,
              type: 'check_status',
              title: `${icon} ${run.conclusion}: ${run.name}`,
              body: `${pr.repository.name}#${pr.number}: ${pr.title}`,
              url: run.html_url,
              repo: pr.repository.full_name, number: pr.number,
            });
          }
        }
        this.checkCache.set(cacheKey, newChecks);
      } catch { /* skip */ }
    }
  }

  private async getAllRateLimits(): Promise<ProviderRateLimitInfo[]> {
    const results = await Promise.allSettled(
      this.registry.all().map(p => p.getRateLimit())
    );
    return results
      .filter((r): r is PromiseFulfilledResult<ProviderRateLimitInfo> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  // ── Getters ──

  getNotifications(): ProviderNotification[] { return this.notifications; }
  getMyPRs(): ProviderUserItem[] { return this.myPRs; }
  getMyIssues(): ProviderUserItem[] { return this.myIssues; }
}
