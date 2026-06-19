'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, WORK_ITEM_TYPES, WORK_ITEM_PRIORITIES, TEAM_MEMBERS } from '@/lib/api';

export default function NewWorkItemPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(WORK_ITEM_TYPES[0]);
  const [priority, setPriority] = useState(WORK_ITEM_PRIORITIES[0]);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createWorkItem({
        title,
        description,
        type,
        priority,
        assignee: assignee || undefined,
        dueDate: dueDate || undefined,
      });
      router.push(`/pm/it-workspace/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work item');
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>New Work Item</h1>
          <p>Create a feature, bug, improvement, or maintenance task.</p>
        </div>
      </div>

      <form className="card" style={{ display: 'grid', gap: 14, maxWidth: 560, margin: 0 }} onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

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
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {WORK_ITEM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
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
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="dueDate">Due Date</label>
            <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Work Item'}
          </button>
        </div>
      </form>
    </section>
  );
}