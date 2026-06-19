const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
};

export type ScoreSummary = {
  total: number;
  events: Array<{ id: string; action: string; points: number; createdAt: string }>;
};

export type WorkspaceSummary = {
  message: string;
  counts: Record<string, number>;
};

export type WorkItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type QaCheck = {
  id: string;
  work_item_id: string;
  test_title: string;
  expected_result: string;
  actual_result: string | null;
  status: string;
  tester: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateQaCheckInput = {
  testTitle: string;
  expectedResult: string;
  tester?: string;
};

export type UpdateQaCheckInput = Partial<{
  testTitle: string;
  expectedResult: string;
  actualResult: string;
  status: string;
  tester: string;
  notes: string;
}>;

export type WorkItemFilters = {
  status?: string;
  priority?: string;
  assignee?: string;
  search?: string;
  mine?: boolean;
};

export type CreateWorkItemInput = {
  title: string;
  description: string;
  type: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
};

export type UpdateWorkItemInput = Partial<CreateWorkItemInput> & {
  status?: string;
};

export type Release = {
  id: string;
  version: string;
  release_date: string | null;
  summary: string | null;
  deployment_status: string;
  created_at: string;
  updated_at: string;
  linkedWorkItems?: WorkItem[];
};

export type CreateReleaseInput = {
  version: string;
  releaseDate?: string;
  summary?: string;
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('spoton_challenge_token');
}

export function saveToken(token: string) {
  window.localStorage.setItem('spoton_challenge_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('spoton_challenge_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(message ?? 'Request failed');
  }
  return data as T;
}

function buildQuery(filters: WorkItemFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.search) params.set('search', filters.search);
  if (filters.mine) params.set('mine', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {

  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<LoginResponse['user']>('/auth/me'),
  score: () => request<ScoreSummary>('/score/me'),
  workspaceSummary: () => request<WorkspaceSummary>('/it-workspace/summary'),

  workItems: (filters: WorkItemFilters = {}) =>
    request<WorkItem[]>(`/it-workspace/work-items${buildQuery(filters)}`),
  workItem: (id: string) => request<WorkItem>(`/it-workspace/work-items/${id}`),
  createWorkItem: (input: CreateWorkItemInput) =>
    request<WorkItem>('/it-workspace/work-items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateWorkItem: (id: string, input: UpdateWorkItemInput) =>
    request<WorkItem>(`/it-workspace/work-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteWorkItem: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/it-workspace/work-items/${id}`, {
      method: 'DELETE',
    }),
  qaChecks: (workItemId: string) =>
    request<QaCheck[]>(`/it-workspace/work-items/${workItemId}/qa-checks`),
  createQaCheck: (workItemId: string, input: CreateQaCheckInput) =>
    request<QaCheck>(`/it-workspace/work-items/${workItemId}/qa-checks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateQaCheck: (id: string, input: UpdateQaCheckInput) =>
    request<QaCheck>(`/it-workspace/qa-checks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteQaCheck: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/it-workspace/qa-checks/${id}`, {
      method: 'DELETE',
    }),
  releases: () => request<Release[]>('/it-workspace/releases'),
  release: (id: string) => request<Release>(`/it-workspace/releases/${id}`),
  createRelease: (input: CreateReleaseInput) =>
    request<Release>('/it-workspace/releases', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  linkWorkItem: (releaseId: string, workItemId: string) =>
    request<Release>(`/it-workspace/releases/${releaseId}/link/${workItemId}`, { method: 'POST' }),
  unlinkWorkItem: (releaseId: string, workItemId: string) =>
    request<Release>(`/it-workspace/releases/${releaseId}/link/${workItemId}`, { method: 'DELETE' }),
  deployRelease: (releaseId: string) =>
    request<Release>(`/it-workspace/releases/${releaseId}/deploy`, { method: 'POST' }),
};

export const TEAM_MEMBERS = ['Intern Candidate', 'Alex Rivera', 'Sam Okafor', 'Priya Nair'];
export const WORK_ITEM_TYPES = ['feature', 'bug', 'improvement', 'maintenance'];
export const WORK_ITEM_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const WORK_ITEM_STATUSES = ['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'];