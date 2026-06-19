'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  WorkItem,
  QaCheck,
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

  const [qaChecks, setQaChecks] = useState<QaCheck[]>([]);
  const [qaLoading, setQaLoading] = useState(true);
  const [qaError, setQaError] = useState('');
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newExpectedResult, setNewExpectedResult] = useState('');
  const [addingQa, setAddingQa] = useState(false);

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
    loadQaChecks();
  }, [id]);

  function loadQaChecks() {
    setQaLoading(true);
    setQaError('');
    api
      .qaChecks(id)
      .then(setQaChecks)
      .catch((err) => setQaError(err instanceof Error ? err.message : 'Failed to load QA checks'))
      .finally(() => setQaLoading(false));
  }

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

  async function handleAddQaCheck(e: React.FormEvent) {
    e.preventDefault();
    setQaError('');
    setAddingQa(true);
    try {
      await api.createQaCheck(id, { testTitle: newTestTitle, expectedResult: newExpectedResult });
      setNewTestTitle('');
      setNewExpectedResult('');
      loadQaChecks();
    } catch (err) {
      setQaError(err instanceof Error ? err.message : 'Failed to add QA check');
    } finally {
      setAddingQa(false);
    }
  }

  async function handleQaStatusChange(qaId: string, newStatus: string) {
    setQaError('');
    try {
      await api.updateQaCheck(qaId, { status: newStatus });
      loadQaChecks();
    } catch (err) {
      setQaError(err instanceof Error ? err.message : 'Failed to update QA check');
    }
  }

  async function handleDeleteQaCheck(qaId: string) {
    if (!confirm('Delete this QA check?')) return;
    setQaError('');
    try {
      await api.deleteQaCheck(qaId);
      loadQaChecks();
    } catch (err) {
      setQaError(err instanceof Error ? err.message : 'Failed to delete QA check');
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

      <section className="card" style={{ marginTop: 20, display: 'grid', gap: 16, maxWidth: 760 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0 }}>QA Checks</h2>
          <div style={{ color: 'var(--muted)' }}>
            {qaChecks.filter((q) => q.status === 'passed').length}/{qaChecks.length} passed
          </div>
        </div>

        {qaError && <div className="card error">{qaError}</div>}

        {qaLoading && <p style={{ margin: 0 }}>Loading QA checks...</p>}

        {!qaLoading && qaChecks.length === 0 && (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No QA checks yet. This work item cannot be marked ready for release until at least one check passes.
          </p>
        )}

        {!qaLoading && qaChecks.length > 0 && (
          <div style={{ display: 'grid', gap: 12 }}>
            {qaChecks.map((qa) => (
              <div
                key={qa.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 14,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{qa.test_title}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{qa.expected_result}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteQaCheck(qa.id)}
                    style={{ border: 0, background: 'none', color: '#b42318', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Delete
                  </button>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`qa-status-${qa.id}`}>Status</label>
                  <select
                    id={`qa-status-${qa.id}`}
                    value={qa.status}
                    onChange={(e) => handleQaStatusChange(qa.id, e.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="passed">passed</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddQaCheck} style={{ display: 'grid', gap: 12 }}>
          <div className="field">
            <label htmlFor="newTestTitle">New test title</label>
            <input
              id="newTestTitle"
              value={newTestTitle}
              onChange={(e) => setNewTestTitle(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="newExpectedResult">Expected result</label>
            <textarea
              id="newExpectedResult"
              value={newExpectedResult}
              onChange={(e) => setNewExpectedResult(e.target.value)}
              required
              rows={3}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}
            />
          </div>

          <div>
            <button className="button" type="submit" disabled={addingQa}>
              {addingQa ? 'Adding...' : 'Add QA Check'}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}