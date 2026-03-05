import { Octokit } from '@octokit/rest';
import { ApiCache } from './ApiCache';
import type {
  GitHubNotification, IssueDetail, PRDetail, Comment,
  RateLimitInfo, UserItem, CheckRun, CheckSuiteSummary,
} from '../../shared/types';

export class GitHubService {
  private octokit: Octokit | null = null;
  private username: string | null = null;
  readonly cache = new ApiCache();

  setToken(token: string): void {
    this.octokit = new Octokit({ auth: token });
    this.username = null;
    this.cache.clear();
  }

  private ensureAuth(): Octokit {
    if (!this.octokit) throw new Error('Not authenticated');
    return this.octokit;
  }

  async getUsername(): Promise<string> {
    if (this.username) return this.username;
    const octokit = this.ensureAuth();
    const { data } = await octokit.users.getAuthenticated();
    this.username = data.login;
    return this.username;
  }

  // ── Generic conditional fetch (uses ETag → 304 saves rate limit) ──

  private async conditionalFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<{ data: T; headers: Record<string, string> }>,
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    try {
      const result = await fetchFn();
      // Store with ETag/Last-Modified
      this.cache.set(
        cacheKey,
        result.data,
        result.headers['etag'] || null,
        result.headers['last-modified'] || null,
      );
      return result.data;
    } catch (err: any) {
      // 304 Not Modified — return cached data (doesn't count against limit)
      if (err.status === 304 && cached) {
        return cached.data as T;
      }
      // 403 Forbidden — might be scope issue, return cached if available
      if (err.status === 403 && cached) {
        return cached.data as T;
      }
      throw err;
    }
  }

  // ── Notifications ──

  async getNotifications(since?: string): Promise<GitHubNotification[]> {
    const octokit = this.ensureAuth();
    const cacheKey = 'notifications';
    const conditionalHeaders = this.cache.getConditionalHeaders(cacheKey);

    return this.conditionalFetch(cacheKey, async () => {
      const params: any = { all: false, per_page: 50, headers: conditionalHeaders };
      if (since) params.since = since;
      const response = await octokit.activity.listNotificationsForAuthenticatedUser(params);
      const data = response.data.map((n: any) => {
        const fullName = n.repository.full_name;
        const [owner, name] = fullName.split('/');
        const urlParts = (n.subject.url || '').split('/');
        const number = parseInt(urlParts[urlParts.length - 1], 10) || undefined;
        return {
          id: n.id,
          repository: { full_name: fullName, owner, name },
          subject: { title: n.subject.title, url: n.subject.url || '', type: n.subject.type },
          reason: n.reason, unread: n.unread, updated_at: n.updated_at, url: n.url, number,
        };
      });
      return { data, headers: response.headers as Record<string, string> };
    });
  }

  // ── My PRs & Issues (cached with ETag) ──

  async getMyPRs(): Promise<UserItem[]> {
    const octokit = this.ensureAuth();
    const username = await this.getUsername();
    const cacheKey = `search:prs:${username}`;
    const conditionalHeaders = this.cache.getConditionalHeaders(cacheKey);

    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.search.issuesAndPullRequests({
        q: `type:pr author:${username} sort:updated`,
        per_page: 50, sort: 'updated', order: 'desc',
        headers: conditionalHeaders as any,
      });
      const data = response.data.items.map((item: any) => this.mapSearchItem(item, 'pr'));
      return { data, headers: response.headers as Record<string, string> };
    });
  }

  async getMyIssues(): Promise<UserItem[]> {
    const octokit = this.ensureAuth();
    const username = await this.getUsername();
    const cacheKey = `search:issues:${username}`;
    const conditionalHeaders = this.cache.getConditionalHeaders(cacheKey);

    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.search.issuesAndPullRequests({
        q: `type:issue involves:${username} sort:updated`,
        per_page: 50, sort: 'updated', order: 'desc',
        headers: conditionalHeaders as any,
      });
      const data = response.data.items.map((item: any) => this.mapSearchItem(item, 'issue'));
      return { data, headers: response.headers as Record<string, string> };
    });
  }

  private mapSearchItem(item: any, type: 'issue' | 'pr'): UserItem {
    const repoUrl: string = item.repository_url || '';
    const repoParts = repoUrl.split('/');
    const repoName = repoParts[repoParts.length - 1] || '';
    const ownerName = repoParts[repoParts.length - 2] || '';
    return {
      id: item.id, number: item.number, title: item.title,
      state: item.pull_request?.merged_at ? 'merged' : item.state,
      html_url: item.html_url,
      repository: { full_name: `${ownerName}/${repoName}`, owner: ownerName, name: repoName },
      user: { login: item.user.login, avatar_url: item.user.avatar_url },
      labels: (item.labels || []).map((l: any) => ({ name: l.name, color: l.color })),
      created_at: item.created_at, updated_at: item.updated_at,
      comments: item.comments, type,
      draft: item.draft || false, merged: !!item.pull_request?.merged_at,
    };
  }

  // ── Detail endpoints (cached by updated_at — skip if unchanged) ──

  async getIssueDetail(owner: string, repo: string, number: number): Promise<IssueDetail> {
    const cacheKey = `issue:${owner}/${repo}#${number}`;
    const cached = this.cache.get(cacheKey);

    // If we have cached data and item hasn't been updated, return cache
    if (cached && !this.cache.needsDetailRefresh(owner, repo, number, '')) {
      return cached.data;
    }

    const octokit = this.ensureAuth();
    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.issues.get({
        owner, repo, issue_number: number,
        headers: this.cache.getConditionalHeaders(cacheKey) as any,
      });
      const data = response.data;
      this.cache.setItemTimestamp(owner, repo, number, data.updated_at);
      const detail: IssueDetail = {
        number: data.number, title: data.title, body: data.body ?? null, state: data.state,
        html_url: data.html_url,
        user: { login: data.user!.login, avatar_url: data.user!.avatar_url },
        labels: (data.labels as any[]).filter(l => typeof l === 'object').map(l => ({ name: l.name, color: l.color })),
        assignees: (data.assignees || []).map((a: any) => ({ login: a.login, avatar_url: a.avatar_url })),
        created_at: data.created_at, updated_at: data.updated_at, comments: data.comments,
        pull_request: data.pull_request ? { html_url: data.pull_request.html_url! } : undefined,
      };
      return { data: detail, headers: response.headers as Record<string, string> };
    });
  }

  async getPRDetail(owner: string, repo: string, number: number): Promise<PRDetail> {
    const cacheKey = `pr:${owner}/${repo}#${number}`;

    const octokit = this.ensureAuth();
    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.pulls.get({
        owner, repo, pull_number: number,
        headers: this.cache.getConditionalHeaders(cacheKey) as any,
      });
      const data = response.data;
      this.cache.setItemTimestamp(owner, repo, number, data.updated_at);
      const detail: PRDetail = {
        number: data.number, title: data.title, body: data.body ?? null, state: data.state,
        html_url: data.html_url,
        user: { login: data.user!.login, avatar_url: data.user!.avatar_url },
        labels: (data.labels as any[]).map(l => ({ name: l.name, color: l.color })),
        assignees: (data.assignees || []).map((a: any) => ({ login: a.login, avatar_url: a.avatar_url })),
        created_at: data.created_at, updated_at: data.updated_at, comments: data.comments,
        merged: data.merged, mergeable: data.mergeable,
        draft: data.draft || false,
        head: { ref: data.head.ref, sha: data.head.sha },
        base: { ref: data.base.ref, sha: data.base.sha },
        additions: data.additions, deletions: data.deletions, changed_files: data.changed_files,
      };
      return { data: detail, headers: response.headers as Record<string, string> };
    });
  }

  async getComments(owner: string, repo: string, number: number): Promise<Comment[]> {
    const cacheKey = `comments:${owner}/${repo}#${number}`;

    const octokit = this.ensureAuth();
    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.issues.listComments({
        owner, repo, issue_number: number, per_page: 100,
        headers: this.cache.getConditionalHeaders(cacheKey) as any,
      });
      const data = response.data.map(c => ({
        id: c.id, body: c.body || '',
        user: { login: c.user!.login, avatar_url: c.user!.avatar_url },
        created_at: c.created_at, updated_at: c.updated_at,
        html_url: c.html_url, author_association: c.author_association,
      }));
      return { data, headers: response.headers as Record<string, string> };
    });
  }

  // ── Check Runs (cached by SHA — same SHA = same checks unless running) ──

  async getCheckRuns(owner: string, repo: string, ref: string): Promise<CheckSuiteSummary> {
    const cacheKey = `checks:${owner}/${repo}@${ref}`;
    const cached = this.cache.get(cacheKey);

    // If cached and all completed, don't re-fetch (checks for a given SHA don't change once done)
    if (cached) {
      const summary = cached.data as CheckSuiteSummary;
      if (summary.pending === 0) {
        return summary;
      }
    }

    const octokit = this.ensureAuth();
    return this.conditionalFetch(cacheKey, async () => {
      const response = await octokit.checks.listForRef({
        owner, repo, ref, per_page: 100,
        headers: this.cache.getConditionalHeaders(cacheKey) as any,
      });
      const runs: CheckRun[] = response.data.check_runs.map((r: any) => ({
        id: r.id, name: r.name, status: r.status, conclusion: r.conclusion,
        html_url: r.html_url, started_at: r.started_at, completed_at: r.completed_at,
        app: r.app ? { name: r.app.name, slug: r.app.slug } : null,
      }));
      const data: CheckSuiteSummary = {
        total: runs.length,
        passed: runs.filter(r => r.conclusion === 'success').length,
        failed: runs.filter(r => r.conclusion === 'failure').length,
        pending: runs.filter(r => r.status !== 'completed').length,
        runs,
      };
      return { data, headers: response.headers as Record<string, string> };
    });
  }

  // ── Linked Items (cached — rarely changes) ──

  async getLinkedItems(owner: string, repo: string, number: number): Promise<{
    linkedIssues: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
    linkedPRs: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
  }> {
    const cacheKey = `linked:${owner}/${repo}#${number}`;
    const cached = this.cache.get(cacheKey);
    // Linked items change very rarely — cache for 5 min
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
      return cached.data;
    }

    const octokit = this.ensureAuth();
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: number });
    const body = issue.body || '';

    const linkedIssues: Array<{ number: number; title: string; state: string; html_url: string; repository: string }> = [];
    const linkedPRs: Array<{ number: number; title: string; state: string; html_url: string; repository: string }> = [];

    const refPattern = /(?:(?:fix(?:es|ed)?|clos(?:es|ed)?|resolv(?:es|ed)?)\s+)?(?:([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+))?#(\d+)/gi;
    const seen = new Set<string>();
    let match;
    while ((match = refPattern.exec(body)) !== null) {
      const refRepo = match[1] || `${owner}/${repo}`;
      const refNum = parseInt(match[2], 10);
      const key = `${refRepo}#${refNum}`;
      if (seen.has(key) || refNum === number) continue;
      seen.add(key);
      try {
        const [refOwner, refName] = refRepo.split('/');
        const { data: ref } = await octokit.issues.get({ owner: refOwner, repo: refName, issue_number: refNum });
        const target = { number: ref.number, title: ref.title, state: ref.state, html_url: ref.html_url, repository: refRepo };
        if (ref.pull_request) linkedPRs.push(target); else linkedIssues.push(target);
      } catch { /* skip inaccessible */ }
    }

    try {
      const { data: events } = await octokit.issues.listEventsForTimeline({
        owner, repo, issue_number: number, per_page: 100,
      });
      for (const event of events as any[]) {
        if (event.event === 'cross-referenced' && event.source?.issue) {
          const src = event.source.issue;
          const srcRepo = src.repository?.full_name || `${owner}/${repo}`;
          const key = `${srcRepo}#${src.number}`;
          if (seen.has(key) || src.number === number) continue;
          seen.add(key);
          const target = { number: src.number, title: src.title, state: src.state, html_url: src.html_url, repository: srcRepo };
          if (src.pull_request) linkedPRs.push(target); else linkedIssues.push(target);
        }
      }
    } catch { /* timeline might not be available */ }

    const result = { linkedIssues, linkedPRs };
    this.cache.set(cacheKey, result, null, null);
    return result;
  }

  // ── Post comment (invalidates comment cache) ──

  async postComment(owner: string, repo: string, number: number, body: string): Promise<Comment> {
    const octokit = this.ensureAuth();
    const { data } = await octokit.issues.createComment({ owner, repo, issue_number: number, body });
    // Invalidate comments cache for this item
    this.cache.set(`comments:${owner}/${repo}#${number}`, null, null, null);
    return {
      id: data.id, body: data.body || '',
      user: { login: data.user!.login, avatar_url: data.user!.avatar_url },
      created_at: data.created_at, updated_at: data.updated_at,
      html_url: data.html_url, author_association: data.author_association,
    };
  }

  // ── Mark as read ──

  async markAsRead(threadId: string): Promise<void> {
    const octokit = this.ensureAuth();
    await octokit.activity.markThreadAsRead({ thread_id: parseInt(threadId, 10) });
  }

  async markAllAsRead(): Promise<void> {
    const octokit = this.ensureAuth();
    await octokit.activity.markNotificationsAsRead({ last_read_at: new Date().toISOString() });
    // Invalidate notifications cache
    this.cache.set('notifications', null, null, null);
  }

  // ── Repos ──

  async getWatchedRepos(): Promise<Array<{ full_name: string; description: string | null }>> {
    const cacheKey = 'watched-repos';
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 10 * 60 * 1000) {
      return cached.data;
    }
    const octokit = this.ensureAuth();
    const { data } = await octokit.activity.listWatchedReposForAuthenticatedUser({ per_page: 100 });
    const result = data.map(r => ({ full_name: r.full_name, description: r.description }));
    this.cache.set(cacheKey, result, null, null);
    return result;
  }

  // ── Rate limit ──

  async getRateLimit(): Promise<RateLimitInfo> {
    const octokit = this.ensureAuth();
    const { data } = await octokit.rateLimit.get();
    return { limit: data.rate.limit, remaining: data.rate.remaining, reset: data.rate.reset };
  }
}
