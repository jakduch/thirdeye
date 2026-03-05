import { BrowserWindow } from 'electron';
import { GitHubService } from './GitHubService';
import { IPC } from '../../shared/ipc-channels';
import type {
  GitHubNotification, UserItem, CheckStatusChange,
  AppSettings, ActivityEvent,
} from '../../shared/types';

export class PollingManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPoll: string | null = null;
  private notifications: GitHubNotification[] = [];
  private myPRs: UserItem[] = [];
  private myIssues: UserItem[] = [];
  // Check run cache: "owner/repo#number" -> Map<checkName, conclusion>
  private checkCache = new Map<string, Map<string, string | null>>();
  // Track PR/Issue states for detecting state changes
  private itemStateCache = new Map<string, { state: string; comments: number; merged?: boolean }>();
  // Track known item IDs to detect new items
  private knownPRIds = new Set<number>();
  private knownIssueIds = new Set<number>();
  private isFirstPoll = true;

  constructor(
    private github: GitHubService,
    private getMainWindow: () => BrowserWindow | null,
    private onNotificationsUpdate: (notifications: GitHubNotification[]) => void,
    private onActivity: (event: ActivityEvent) => void,
    private getSettings: () => Promise<AppSettings>,
  ) {}

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
    try {
      const [notifResult, prs, issues] = await Promise.allSettled([
        this.github.getNotifications(this.lastPoll || undefined),
        this.github.getMyPRs(),
        this.github.getMyIssues(),
      ]);
      this.lastPoll = new Date().toISOString();

      // ── Notifications ──
      if (notifResult.status === 'fulfilled') {
        const newNotifications = notifResult.value;
        const existing = new Map(this.notifications.map(n => [n.id, n]));
        for (const n of newNotifications) existing.set(n.id, n);
        this.notifications = Array.from(existing.values())
          .filter(n => this.shouldIncludeRepo(n.repository.full_name, settings))
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }

      // ── PRs ──
      if (prs.status === 'fulfilled') {
        const filtered = prs.value.filter(p => this.shouldIncludeRepo(p.repository.full_name, settings));
        if (!this.isFirstPoll) {
          this.detectItemChanges(filtered, 'pr');
        } else {
          // First poll — just populate caches, no notifications
          for (const pr of filtered) {
            this.knownPRIds.add(pr.id);
            this.itemStateCache.set(`pr:${pr.id}`, {
              state: pr.state, comments: pr.comments, merged: pr.merged,
            });
          }
        }
        this.myPRs = filtered;
      }

      // ── Issues ──
      if (issues.status === 'fulfilled') {
        const filtered = issues.value.filter(i => this.shouldIncludeRepo(i.repository.full_name, settings));
        if (!this.isFirstPoll) {
          this.detectItemChanges(filtered, 'issue');
        } else {
          for (const issue of filtered) {
            this.knownIssueIds.add(issue.id);
            this.itemStateCache.set(`issue:${issue.id}`, {
              state: issue.state, comments: issue.comments,
            });
          }
        }
        this.myIssues = filtered;
      }

      // ── Check Runs for open PRs ──
      await this.pollCheckRuns(this.myPRs.filter(pr => pr.state === 'open'));

      this.isFirstPoll = false;
      this.onNotificationsUpdate(this.notifications);

      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.NOTIFICATIONS_UPDATED, this.notifications);
        win.webContents.send(IPC.MY_PRS_UPDATED, this.myPRs);
        win.webContents.send(IPC.MY_ISSUES_UPDATED, this.myIssues);
      }

      const rateLimit = await this.github.getRateLimit();
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.RATE_LIMIT_INFO, rateLimit);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }

  /** Detect new items, state changes, new comments, merges */
  private detectItemChanges(items: UserItem[], type: 'pr' | 'issue'): void {
    const knownIds = type === 'pr' ? this.knownPRIds : this.knownIssueIds;

    for (const item of items) {
      const cacheKey = `${type}:${item.id}`;
      const prev = this.itemStateCache.get(cacheKey);

      if (!knownIds.has(item.id)) {
        // New item appeared
        knownIds.add(item.id);
        this.onActivity({
          type: type === 'pr' ? 'new_pr' : 'new_issue',
          title: `New ${type === 'pr' ? 'PR' : 'Issue'}: ${item.repository.name}#${item.number}`,
          body: item.title,
          url: item.html_url,
          repo: item.repository.full_name,
          number: item.number,
        });
      } else if (prev) {
        // Check for state changes
        if (type === 'pr' && item.merged && !prev.merged) {
          this.onActivity({
            type: 'merged',
            title: `Merged: ${item.repository.name}#${item.number}`,
            body: item.title,
            url: item.html_url,
            repo: item.repository.full_name,
            number: item.number,
          });
        } else if (prev.state !== item.state) {
          this.onActivity({
            type: 'state_change',
            title: `${item.state === 'closed' ? 'Closed' : 'Reopened'}: ${item.repository.name}#${item.number}`,
            body: item.title,
            url: item.html_url,
            repo: item.repository.full_name,
            number: item.number,
          });
        }

        // Check for new comments
        if (item.comments > prev.comments) {
          const newCount = item.comments - prev.comments;
          this.onActivity({
            type: 'new_comment',
            title: `${newCount} new comment${newCount > 1 ? 's' : ''}: ${item.repository.name}#${item.number}`,
            body: item.title,
            url: item.html_url,
            repo: item.repository.full_name,
            number: item.number,
          });
        }
      }

      // Update cache
      this.itemStateCache.set(cacheKey, {
        state: item.state,
        comments: item.comments,
        merged: item.merged,
      });
    }
  }

  private async pollCheckRuns(openPRs: UserItem[]): Promise<void> {
    const win = this.getMainWindow();
    for (const pr of openPRs) {
      try {
        const detail = await this.github.getPRDetail(pr.repository.owner, pr.repository.name, pr.number);
        const checks = await this.github.getCheckRuns(pr.repository.owner, pr.repository.name, detail.head.sha);
        pr.checks = checks;

        const cacheKey = `${pr.repository.full_name}#${pr.number}`;
        const prevChecks = this.checkCache.get(cacheKey) || new Map();
        const newChecks = new Map<string, string | null>();

        for (const run of checks.runs) {
          newChecks.set(run.name, run.conclusion);
          const prev = prevChecks.get(run.name);
          if (prev !== undefined && prev !== run.conclusion && run.status === 'completed' && run.conclusion) {
            // Check status changed — fire both legacy callback and activity event
            const change: CheckStatusChange = {
              prNumber: pr.number, prTitle: pr.title, repo: pr.repository.full_name,
              checkName: run.name, conclusion: run.conclusion, html_url: run.html_url,
            };
            if (win && !win.isDestroyed()) {
              win.webContents.send(IPC.CHECK_STATUS_CHANGED, change);
            }
            const icon = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⚠️';
            this.onActivity({
              type: 'check_status',
              title: `${icon} ${run.conclusion}: ${run.name}`,
              body: `${pr.repository.name}#${pr.number}: ${pr.title}`,
              url: run.html_url,
              repo: pr.repository.full_name,
              number: pr.number,
            });
          }
        }
        this.checkCache.set(cacheKey, newChecks);
      } catch { /* skip */ }
    }
  }

  getNotifications(): GitHubNotification[] { return this.notifications; }
  getMyPRs(): UserItem[] { return this.myPRs; }
  getMyIssues(): UserItem[] { return this.myIssues; }
}
