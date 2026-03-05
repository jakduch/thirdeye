import { BaseProvider } from '../BaseProvider';
import type { Account } from '../../../shared/provider-types';
import type {
  ProviderNotification, ProviderUserItem,
  ProviderIssueDetail, ProviderPRDetail,
  ProviderComment, ProviderCheckSuiteSummary,
  ProviderRateLimitInfo, ProviderRepo, ProviderLinkedItems,
  ProviderCheckRun,
} from '../../../shared/provider-types';

/**
 * Bitbucket Cloud provider.
 *
 * Auth: Basic Auth with App Password (username:appPassword).
 * API: v2 REST (https://api.bitbucket.org/2.0/...)
 */
export class BitbucketProvider extends BaseProvider {
  private baseURL: string;

  constructor(account: Account) {
    super(account);
    this.baseURL = this.buildBaseURL();
  }

  private buildBaseURL(): string {
    return (this.instanceUrl || 'https://api.bitbucket.org').replace(/\/+$/, '') + '/2.0';
  }

  setToken(token: string): void {
    super.setToken(token);
    this.baseURL = this.buildBaseURL();
  }

  private async request<T = any>(path: string, options: {
    method?: string;
    params?: Record<string, string | number | boolean>;
    body?: any;
  } = {}): Promise<{ data: T; headers: Headers }> {
    const { method = 'GET', params, body } = options;
    let url = `${this.baseURL}${path}`;
    if (params) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.set(k, String(v));
      }
      const qs = sp.toString();
      if (qs) url += '?' + qs;
    }
    const authHeader = 'Basic ' + Buffer.from(`${this.username || ''}:${this.token}`).toString('base64');
    const init: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const resp = await fetch(url, init);
    if (!resp.ok) throw new Error(`Bitbucket API ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    return { data, headers: resp.headers };
  }

  async getUsername(): Promise<string> {
    if (this.username) return this.username;
    const { data } = await this.request<any>('/user');
    this.username = data.username || data.display_name;
    return this.username!;
  }

  // ── Notifications (Bitbucket has no real notifications API — return empty) ──

  async getNotifications(_since?: string): Promise<ProviderNotification[]> {
    // Bitbucket Cloud doesn't have a notifications endpoint.
    // Future: could poll inbox or pull request activity.
    return [];
  }

  // ── PRs ──

  async getMyPRs(): Promise<ProviderUserItem[]> {
    const username = await this.getUsername();
    // Fetch PRs authored by the current user across all repos they have access to
    const { data } = await this.request<any>('/pullrequests/' + encodeURIComponent(username), {
      params: { state: 'OPEN,MERGED,DECLINED', pagelen: 50, sort: '-updated_on' },
    });
    return ((data.values || []) as any[]).map(pr => this.mapPR(pr));
  }

  private mapPR(pr: any): ProviderUserItem {
    const repo = pr.destination?.repository || pr.source?.repository || {};
    const fullName = repo.full_name || '';
    const [owner, name] = fullName.split('/');

    let state = 'open';
    if (pr.state === 'MERGED') state = 'merged';
    else if (pr.state === 'DECLINED') state = 'closed';

    return {
      id: pr.id,
      provider: 'bitbucket',
      accountId: this.accountId,
      number: pr.id,
      title: pr.title,
      state,
      html_url: pr.links?.html?.href || '',
      repository: { full_name: fullName, owner: owner || '', name: name || '' },
      user: { login: pr.author?.display_name || pr.author?.nickname || '', avatar_url: pr.author?.links?.avatar?.href || '' },
      labels: [],
      created_at: pr.created_on,
      updated_at: pr.updated_on,
      comments: pr.comment_count || 0,
      type: 'pr',
      draft: false,
      merged: pr.state === 'MERGED',
    };
  }

  // ── Issues (Bitbucket issues are repo-specific, not all repos have them) ──

  async getMyIssues(): Promise<ProviderUserItem[]> {
    // Bitbucket doesn't have a cross-repo issue search.
    // Would need to iterate repos. For now return empty.
    return [];
  }

  // ── Detail endpoints ──

  async getIssueDetail(owner: string, repo: string, number: number): Promise<ProviderIssueDetail> {
    const { data } = await this.request<any>(`/repositories/${owner}/${repo}/issues/${number}`);
    return {
      provider: 'bitbucket', accountId: this.accountId,
      number: data.id, title: data.title, body: data.content?.raw ?? null,
      state: data.state === 'closed' || data.state === 'resolved' ? 'closed' : 'open',
      html_url: data.links?.html?.href || '',
      user: { login: data.reporter?.display_name || '', avatar_url: data.reporter?.links?.avatar?.href || '' },
      labels: [], assignees: data.assignee
        ? [{ login: data.assignee.display_name || '', avatar_url: data.assignee.links?.avatar?.href || '' }]
        : [],
      created_at: data.created_on, updated_at: data.updated_on,
      comments: 0,
    };
  }

  async getPRDetail(owner: string, repo: string, number: number): Promise<ProviderPRDetail> {
    const { data: pr } = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}`);

    let additions = 0, deletions = 0, changed_files = 0;
    try {
      const { data: diffstat } = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/diffstat`, {
        params: { pagelen: 500 },
      });
      const values = diffstat.values || [];
      changed_files = values.length;
      for (const v of values) {
        additions += v.lines_added || 0;
        deletions += v.lines_removed || 0;
      }
    } catch { /* ignore */ }

    let state = 'open';
    if (pr.state === 'MERGED') state = 'merged';
    else if (pr.state === 'DECLINED') state = 'closed';

    return {
      provider: 'bitbucket', accountId: this.accountId,
      number: pr.id, title: pr.title, body: pr.description || null, state,
      html_url: pr.links?.html?.href || '',
      user: { login: pr.author?.display_name || '', avatar_url: pr.author?.links?.avatar?.href || '' },
      labels: [],
      assignees: (pr.reviewers || []).map((r: any) => ({
        login: r.display_name || '', avatar_url: r.links?.avatar?.href || '',
      })),
      created_at: pr.created_on, updated_at: pr.updated_on,
      comments: pr.comment_count || 0,
      merged: pr.state === 'MERGED',
      mergeable: null, // Bitbucket doesn't expose this easily
      draft: false,
      head: { ref: pr.source?.branch?.name || '', sha: pr.source?.commit?.hash || '' },
      base: { ref: pr.destination?.branch?.name || '', sha: pr.destination?.commit?.hash || '' },
      additions, deletions, changed_files,
    };
  }

  async getComments(owner: string, repo: string, number: number): Promise<ProviderComment[]> {
    const { data } = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/comments`, {
      params: { pagelen: 100, sort: 'created_on' },
    });
    return ((data.values || []) as any[])
      .filter((c: any) => !c.deleted)
      .map((c: any) => ({
        id: c.id,
        provider: 'bitbucket' as const,
        accountId: this.accountId,
        body: c.content?.raw || '',
        user: { login: c.user?.display_name || '', avatar_url: c.user?.links?.avatar?.href || '' },
        created_at: c.created_on,
        updated_at: c.updated_on || c.created_on,
        html_url: c.links?.html?.href || '',
        author_association: 'NONE',
      }));
  }

  async postComment(owner: string, repo: string, number: number, body: string): Promise<ProviderComment> {
    const { data } = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/comments`, {
      method: 'POST', body: { content: { raw: body } },
    });
    return {
      id: data.id, provider: 'bitbucket', accountId: this.accountId,
      body: data.content?.raw || '',
      user: { login: data.user?.display_name || '', avatar_url: data.user?.links?.avatar?.href || '' },
      created_at: data.created_on, updated_at: data.updated_on || data.created_on,
      html_url: data.links?.html?.href || '', author_association: 'NONE',
    };
  }

  // ── CI (Pipelines) ──

  async getCheckRuns(owner: string, repo: string, ref: string): Promise<ProviderCheckSuiteSummary> {
    try {
      const { data } = await this.request<any>(`/repositories/${owner}/${repo}/commit/${ref}/statuses`, {
        params: { pagelen: 50 },
      });
      const runs: ProviderCheckRun[] = ((data.values || []) as any[]).map(s => ({
        id: s.id || 0,
        name: s.name || s.key || 'Pipeline',
        status: s.state === 'SUCCESSFUL' || s.state === 'FAILED' || s.state === 'STOPPED'
          ? 'completed' : s.state === 'INPROGRESS' ? 'in_progress' : 'queued',
        conclusion: s.state === 'SUCCESSFUL' ? 'success'
          : s.state === 'FAILED' ? 'failure'
          : s.state === 'STOPPED' ? 'cancelled'
          : null,
        html_url: s.url || '',
        started_at: s.created_on || null,
        completed_at: s.updated_on || null,
        app: { name: 'Bitbucket Pipelines', slug: 'bitbucket-pipelines' },
      }));
      return {
        total: runs.length,
        passed: runs.filter(r => r.conclusion === 'success').length,
        failed: runs.filter(r => r.conclusion === 'failure').length,
        pending: runs.filter(r => r.status !== 'completed').length,
        runs,
      };
    } catch {
      return { total: 0, passed: 0, failed: 0, pending: 0, runs: [] };
    }
  }

  // ── Linked items ──

  async getLinkedItems(_owner: string, _repo: string, _number: number): Promise<ProviderLinkedItems> {
    return { linkedIssues: [], linkedPRs: [] };
  }

  // ── Repos ──

  async getWatchedRepos(): Promise<ProviderRepo[]> {
    const username = await this.getUsername();
    const { data } = await this.request<any>(`/repositories/${username}`, {
      params: { pagelen: 100, sort: '-updated_on', role: 'member' },
    });
    return ((data.values || []) as any[]).map(r => ({
      full_name: r.full_name,
      description: r.description || null,
      provider: 'bitbucket' as const,
      accountId: this.accountId,
    }));
  }

  // ── Rate limit (Bitbucket doesn't have a public endpoint) ──

  async getRateLimit(): Promise<ProviderRateLimitInfo> {
    return {
      accountId: this.accountId, provider: 'bitbucket',
      displayName: this.username || this.accountId,
      limit: 1000, remaining: 1000, reset: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  // ── Mark as read (no-op for Bitbucket) ──

  async markAsRead(_threadId: string): Promise<void> { /* no-op */ }
  async markAllAsRead(): Promise<void> { /* no-op */ }
}
