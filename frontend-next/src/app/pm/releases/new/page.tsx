'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewReleasePage() {
  const router = useRouter();
  const [version, setVersion] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createRelease({
        version,
        releaseDate: releaseDate || undefined,
        summary: summary || undefined,
      });
      router.push(`/pm/releases/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create release');
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>New Release</h1>
          <p>Plan a new deployment and link ready work items to it.</p>
        </div>
      </div>

      <form className="card" style={{ display: 'grid', gap: 14, maxWidth: 480, margin: 0 }} onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="field">
          <label htmlFor="version">Version</label>
          <input id="version" placeholder="v1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="releaseDate">Release Date</label>
          <input id="releaseDate" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}
          />
        </div>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Release'}
        </button>
      </form>
    </section>
  );
}