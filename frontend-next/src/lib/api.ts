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
};

export const TEAM_MEMBERS = ['Intern Candidate', 'Alex Rivera', 'Sam Okafor', 'Priya Nair'];
export const WORK_ITEM_TYPES = ['feature', 'bug', 'improvement', 'maintenance'];
export const WORK_ITEM_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const WORK_ITEM_STATUSES = ['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'];