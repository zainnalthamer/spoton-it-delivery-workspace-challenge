'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  WorkItem,
  WORK_ITEM_TYPES,
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  TEAM_MEMBERS,
} from '@/lib/api';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  backlog: ['backlog', 'planned'],
  planned: ['planned', 'in_progress'],
  in_progress: ['in_progress', 'qa'],
  qa: ['qa', 'ready_for_release', 'in_progress'],
  ready_for_release: ['ready_for_release', 'released', 'qa'],
  released: ['released'],
};

export default function WorkItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .workItem(id)
      .then((data) => {
        setItem(data);
        setTitle(data.title);
        setDescription(data.description);
        setType(data.type);
        setPriority(data.priority);
        setStatus(data.status);
        setAssignee(data.assignee ?? '');
        setDueDate(data.due_date ? data.due_date.slice(0, 10) : '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load work item'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateWorkItem(id, {
        title,
        description,
        type,
        priority,
        status,
        assignee: assignee || undefined,
        dueDate: dueDate || undefined,
      });
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this work item? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteWorkItem(id);
      router.push('/pm/it-workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete work item');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section>
        <div className="card">Loading work item...</div>
      </section>
    );
  }

  if (error && !item) {
    return (
      <section>
        <div className="card error">{error}</div>
        <Link href="/pm/it-workspace" className="button secondary" style={{ marginTop: 12, display: 'inline-block' }}>
          Back to Work Items
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>{item?.title}</h1>
          <p>
            Created by {item?.created_by} on{' '}
            {item?.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
          </p>
        </div>
        <Link href="/pm/it-workspace" className="button secondary">
          Back to List
        </Link>
      </div>

      {error && <div className="card error" style={{ marginBottom: 18 }}>{error}</div>}

      <form className="card" style={{ display: 'grid', gap: 14, maxWidth: 560 }} onSubmit={handleSave}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
              {WORK_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {WORK_ITEM_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="status">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {(ALLOWED_TRANSITIONS[item?.status ?? 'backlog'] ?? WORK_ITEM_STATUSES).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="assignee">Assignee</label>
            <select id="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="dueDate">Due Date</label>
            <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: '#b42318' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </form>
    </section>
  );
}