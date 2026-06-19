'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem, WorkItemFilters, WORK_ITEM_STATUSES, WORK_ITEM_PRIORITIES, TEAM_MEMBERS } from '@/lib/api';

export default function ItWorkspacePage() {
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<WorkItemFilters>({});
  const [searchInput, setSearchInput] = useState('');

  function load(currentFilters: WorkItemFilters) {
    setLoading(true);
    setError('');
    api
      .workItems(currentFilters)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load work items'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(filters);
  }, [filters]);

  function updateFilter(key: keyof WorkItemFilters, value: string | boolean) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>Work Items</h1>
          <p>Track features, bugs, improvements, and maintenance work across the team.</p>
        </div>
        <Link href="/pm/it-workspace/new" className="button">
          + New Work Item
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter('search', searchInput);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All</option>
              {WORK_ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={filters.priority ?? ''} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">All</option>
              {WORK_ITEM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="assignee">Assignee</label>
            <select id="assignee" value={filters.assignee ?? ''} onChange={(e) => updateFilter('assignee', e.target.value)}>
              <option value="">All</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button className="button secondary" onClick={() => updateFilter('search', searchInput)}>
            Apply Search
          </button>

          <button
            className="button secondary"
            onClick={() => updateFilter('mine', !filters.mine)}
            style={{ background: filters.mine ? 'var(--orange)' : undefined }}
          >
            {filters.mine ? 'Showing My Work' : 'Show My Work'}
          </button>

          {(filters.status || filters.priority || filters.search || filters.mine) && (
            <button
              className="button secondary"
              onClick={() => {
                setFilters({});
                setSearchInput('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading && <div className="card">Loading work items...</div>}

      {error && !loading && <div className="card error">{error}</div>}

      {!loading && !error && items && items.length === 0 && (
        <div className="card empty">No work items match your filters yet. Create one to get started.</div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/pm/it-workspace/${item.id}`}>{item.title}</Link>
                  </td>
                  <td>{item.type}</td>
                  <td>
                    <span className="badge">{item.status}</span>
                  </td>
                  <td>{item.priority}</td>
                  <td>{item.assignee ?? '—'}</td>
                  <td>{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}