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
 * GitLab provider — supports gitlab.com and self-hosted instances.
 *
 * Auth: PRIVATE-TOKEN header with Personal Access Token.
 * API: v4 REST (/api/v4/...)
 */
export class GitLabProvider extends BaseProvider {
  private baseURL: string;

  constructor(account: Account) {
    super(account);
    this.baseURL = this.buildBaseURL();
  }

  private buildBaseURL(): string {
    return (this.instanceUrl || 'https://gitlab.com').replace(/\/+$/, '') + '/api/v4';
  }

  setToken(token: string): void {
    super.setToken(token);
    this.baseURL = this.buildBaseURL();
  }

  private async request<T = any>(path: string, options: {
    method?: string;
    params?: Record<string, string | number | boolean>;
    body?: any;
    headOnly?: boolean;
  } = {}): Promise<{ data: T; headers: Headers }> {
    const { method = 'GET', params, body, headOnly } = options;
    let url = `${this.baseURL}${path}`;
    if (params) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.set(k, String(v));
      }
      const qs = sp.toString();
      if (qs) url += '?' + qs;
    }
    const init: RequestInit = {
      method: headOnly ? 'HEAD' : method,
      headers: {
        'PRIVATE-TOKEN': this.token,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const resp = await fetch(url, init);
    if (!resp.ok) throw new Error(`GitLab API ${resp.status}: ${resp.statusText}`);
    if (headOnly) return { data: null as any, headers: resp.headers };
    const data = await resp.json();
    return { data, headers: resp.headers };
  }

  async getUsername(): Promise<string> {
    if (this.username) return this.username;
    const { data } = await this.request<any>('/user');
    this.username = data.username;
    return this.username!;
  }

  // ── Notifications (GitLab Todos) ──

  async getNotifications(_since?: string): Promise<ProviderNotification[]> {
    const { data: todos } = await this.request<any[]>('/todos', {
      params: { per_page: 50, state: 'pending' },
    });
    return todos.map(t => {
      const target = t.target || {};
      const project = t.project || {};
      const pathParts = (project.path_with_namespace || '').split('/');
      const owner = pathParts.slice(0, -1).join('/') || pathParts[0] || '';
      const name = pathParts[pathParts.length - 1] || '';
      let subjectType: ProviderNotification['subject']['type'] = 'Other';
      if (t.target_type === 'MergeRequest') subjectType = 'MergeRequest';
      else if (t.target_type === 'Issue') subjectType = 'Issue';
      else if (t.target_type === 'Commit') subjectType = 'Commit';

      return {
        id: String(t.id),
        provider: 'gitlab' as const,
        accountId: this.accountId,
        repository: { full_name: project.path_with_namespace || '', owner, name },
        subject: {
          title: target.title || t.body || 'Notification',
          url: target.web_url || '',
          type: subjectType,
        },
        reason: t.action_name || 'todo',
        unread: t.state === 'pending',
        updated_at: t.updated_at || t.created_at,
        url: t.target_url || '',
        number: target.iid,
        html_url: target.web_url,
        user: t.author ? { login: t.author.username, avatar_url: t.author.avatar_url || '' } : undefined,
      };
    });
  }

  // ── MRs (merge requests = PRs) ──

  async getMyPRs(): Promise<ProviderUserItem[]> {
    const { data: mrs } = await this.request<any[]>('/merge_requests', {
      params: { scope: 'created_by_me', state: 'all', per_page: 50, order_by: 'updated_at', sort: 'desc' },
    });
    return mrs.map(mr => this.mapMR(mr));
  }

  private mapMR(mr: any): ProviderUserItem {
    const projectPath = mr.web_url ? this.extractProjectPath(mr.web_url) : '';
    const parts = projectPath.split('/');
    const name = parts[parts.length - 1] || '';
    const owner = parts.slice(0, -1).join('/') || '';

    return {
      id: mr.id,
      provider: 'gitlab',
      accountId: this.accountId,
      number: mr.iid,
      title: mr.title,
      state: mr.state === 'merged' ? 'merged' : mr.state === 'closed' ? 'closed' : 'open',
      html_url: mr.web_url,
      repository: { full_name: projectPath, owner, name },
      user: { login: mr.author?.username || '', avatar_url: mr.author?.avatar_url || '' },
      labels: (mr.labels || []).map((l: string) => ({ name: l, color: 'e8e8e8' })),
      created_at: mr.created_at,
      updated_at: mr.updated_at,
      comments: mr.user_notes_count || 0,
      type: 'mr',
      draft: mr.draft || mr.work_in_progress || false,
      merged: mr.state === 'merged',
    };
  }

  // ── Issues ──

  async getMyIssues(): Promise<ProviderUserItem[]> {
    const username = await this.getUsername();
    const { data: issues } = await this.request<any[]>('/issues', {
      params: { scope: 'all', assignee_username: username, state: 'all', per_page: 50, order_by: 'updated_at', sort: 'desc' },
    });
    return issues.map(issue => this.mapIssue(issue));
  }

  private mapIssue(issue: any): ProviderUserItem {
    const projectPath = issue.web_url ? this.extractProjectPath(issue.web_url) : '';
    const parts = projectPath.split('/');
    const name = parts[parts.length - 1] || '';
    const owner = parts.slice(0, -1).join('/') || '';

    return {
      id: issue.id,
      provider: 'gitlab',
      accountId: this.accountId,
      number: issue.iid,
      title: issue.title,
      state: issue.state === 'closed' ? 'closed' : 'open',
      html_url: issue.web_url,
      repository: { full_name: projectPath, owner, name },
      user: { login: issue.author?.username || '', avatar_url: issue.author?.avatar_url || '' },
      labels: (issue.labels || []).map((l: string) => ({ name: l, color: 'e8e8e8' })),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      comments: issue.user_notes_count || 0,
      type: 'issue',
    };
  }

  private extractProjectPath(webUrl: string): string {
    try {
      const url = new URL(webUrl);
      const pathParts = url.pathname.split('/-/');
      return (pathParts[0] || '').replace(/^\//, '');
    } catch {
      return '';
    }
  }

  // ── Detail endpoints ──

  async getIssueDetail(owner: string, repo: string, number: number): Promise<ProviderIssueDetail> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const { data } = await this.request<any>(`/projects/${projectPath}/issues/${number}`);
    return {
      provider: 'gitlab', accountId: this.accountId,
      number: data.iid, title: data.title, body: data.description ?? null,
      state: data.state === 'closed' ? 'closed' : 'open',
      html_url: data.web_url,
      user: { login: data.author?.username || '', avatar_url: data.author?.avatar_url || '' },
      labels: (data.labels || []).map((l: string) => ({ name: l, color: 'e8e8e8' })),
      assignees: (data.assignees || []).map((a: any) => ({ login: a.username, avatar_url: a.avatar_url || '' })),
      created_at: data.created_at, updated_at: data.updated_at,
      comments: data.user_notes_count || 0,
    };
  }

  async getPRDetail(owner: string, repo: string, number: number): Promise<ProviderPRDetail> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const { data: mr } = await this.request<any>(`/projects/${projectPath}/merge_requests/${number}`);

    let additions = 0, deletions = 0, changed_files = 0;
    try {
      const { data: changes } = await this.request<any>(`/projects/${projectPath}/merge_requests/${number}/changes`, {
        params: { access_raw_diffs: false },
      });
      changed_files = (changes.changes || []).length;
      for (const c of (changes.changes || [])) {
        const diff: string = c.diff || '';
        const lines = diff.split('\n');
        additions += lines.filter((l: string) => l.startsWith('+') && !l.startsWith('+++')).length;
        deletions += lines.filter((l: string) => l.startsWith('-') && !l.startsWith('---')).length;
      }
    } catch { /* ignore */ }

    return {
      provider: 'gitlab', accountId: this.accountId,
      number: mr.iid, title: mr.title, body: mr.description ?? null,
      state: mr.state === 'merged' ? 'merged' : mr.state === 'closed' ? 'closed' : 'open',
      html_url: mr.web_url,
      user: { login: mr.author?.username || '', avatar_url: mr.author?.avatar_url || '' },
      labels: (mr.labels || []).map((l: string) => ({ name: l, color: 'e8e8e8' })),
      assignees: (mr.assignees || []).map((a: any) => ({ login: a.username, avatar_url: a.avatar_url || '' })),
      created_at: mr.created_at, updated_at: mr.updated_at,
      comments: mr.user_notes_count || 0,
      merged: mr.state === 'merged',
      mergeable: mr.merge_status === 'can_be_merged' ? true : mr.merge_status === 'cannot_be_merged' ? false : null,
      draft: mr.draft || mr.work_in_progress || false,
      head: { ref: mr.source_branch, sha: mr.sha || '' },
      base: { ref: mr.target_branch, sha: mr.diff_refs?.base_sha || '' },
      additions, deletions, changed_files,
    };
  }

  async getComments(owner: string, repo: string, number: number): Promise<ProviderComment[]> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    try {
      const { data: notes } = await this.request<any[]>(`/projects/${projectPath}/merge_requests/${number}/notes`, {
        params: { per_page: 100, sort: 'asc' },
      });
      return this.mapNotes(notes);
    } catch {
      const { data: notes } = await this.request<any[]>(`/projects/${projectPath}/issues/${number}/notes`, {
        params: { per_page: 100, sort: 'asc' },
      });
      return this.mapNotes(notes);
    }
  }

  private mapNotes(notes: any[]): ProviderComment[] {
    return notes
      .filter(n => !n.system)
      .map(n => ({
        id: n.id,
        provider: 'gitlab' as const,
        accountId: this.accountId,
        body: n.body || '',
        user: { login: n.author?.username || '', avatar_url: n.author?.avatar_url || '' },
        created_at: n.created_at,
        updated_at: n.updated_at || n.created_at,
        html_url: '',
        author_association: n.author?.is_admin ? 'OWNER' : 'NONE',
      }));
  }

  async postComment(owner: string, repo: string, number: number, body: string): Promise<ProviderComment> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    let data: any;
    try {
      const response = await this.request<any>(`/projects/${projectPath}/merge_requests/${number}/notes`, {
        method: 'POST', body: { body },
      });
      data = response.data;
    } catch {
      const response = await this.request<any>(`/projects/${projectPath}/issues/${number}/notes`, {
        method: 'POST', body: { body },
      });
      data = response.data;
    }
    return {
      id: data.id, provider: 'gitlab', accountId: this.accountId,
      body: data.body || '',
      user: { login: data.author?.username || '', avatar_url: data.author?.avatar_url || '' },
      created_at: data.created_at, updated_at: data.updated_at || data.created_at,
      html_url: '', author_association: 'NONE',
    };
  }

  // ── CI (Pipelines → Checks) ──

  async getCheckRuns(owner: string, repo: string, ref: string): Promise<ProviderCheckSuiteSummary> {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    try {
      const { data: pipelines } = await this.request<any[]>(`/projects/${projectPath}/pipelines`, {
        params: { sha: ref, per_page: 5, order_by: 'updated_at', sort: 'desc' },
      });
      if (!pipelines.length) return { total: 0, passed: 0, failed: 0, pending: 0, runs: [] };

      const latestPipeline = pipelines[0];
      const { data: jobs } = await this.request<any[]>(`/projects/${projectPath}/pipelines/${latestPipeline.id}/jobs`, {
        params: { per_page: 100 },
      });

      const runs: ProviderCheckRun[] = jobs.map(j => ({
        id: j.id,
        name: j.name,
        status: ['success', 'failed', 'canceled', 'skipped'].includes(j.status)
          ? 'completed' : j.status === 'running' ? 'in_progress' : 'queued',
        conclusion: j.status === 'success' ? 'success'
          : j.status === 'failed' ? 'failure'
          : j.status === 'canceled' ? 'cancelled'
          : j.status === 'skipped' ? 'skipped'
          : null,
        html_url: j.web_url || '',
        started_at: j.started_at || null,
        completed_at: j.finished_at || null,
        app: { name: 'GitLab CI', slug: 'gitlab-ci' },
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

  async getLinkedItems(_owner: string, _repo: string, _number: number): Promise<ProviderLinkedItems> {
    return { linkedIssues: [], linkedPRs: [] };
  }

  // ── Repos (Projects) ──

  async getWatchedRepos(): Promise<ProviderRepo[]> {
    const { data: projects } = await this.request<any[]>('/projects', {
      params: { membership: true, per_page: 100, order_by: 'last_activity_at', sort: 'desc' },
    });
    return projects.map(p => ({
      full_name: p.path_with_namespace,
      description: p.description,
      provider: 'gitlab' as const,
      accountId: this.accountId,
    }));
  }

  // ── Rate limit ──

  async getRateLimit(): Promise<ProviderRateLimitInfo> {
    try {
      const { headers } = await this.request('/user', { headOnly: true });
      return {
        accountId: this.accountId, provider: 'gitlab',
        displayName: this.username || this.accountId,
        limit: parseInt(headers.get('ratelimit-limit') || '0', 10) || 2000,
        remaining: parseInt(headers.get('ratelimit-remaining') || '0', 10) || 2000,
        reset: parseInt(headers.get('ratelimit-reset') || '0', 10) || Math.floor(Date.now() / 1000) + 3600,
      };
    } catch {
      return {
        accountId: this.accountId, provider: 'gitlab',
        displayName: this.username || this.accountId,
        limit: 2000, remaining: 2000, reset: Math.floor(Date.now() / 1000) + 3600,
      };
    }
  }

  // ── Mark as read ──

  async markAsRead(threadId: string): Promise<void> {
    await this.request(`/todos/${threadId}/mark_as_done`, { method: 'POST' });
  }

  async markAllAsRead(): Promise<void> {
    await this.request('/todos/mark_as_done', { method: 'POST' });
  }
}
