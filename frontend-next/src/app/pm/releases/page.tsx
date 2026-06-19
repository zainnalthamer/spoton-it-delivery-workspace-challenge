'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Release } from '@/lib/api';

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .releases()
      .then(setReleases)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load releases'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>Releases</h1>
          <p>Plan deployments and track what shipped in each version.</p>
        </div>
        <Link href="/pm/releases/new" className="button">
          + New Release
        </Link>
      </div>

      {loading && <div className="card">Loading releases...</div>}
      {error && !loading && <div className="card error">{error}</div>}

      {!loading && !error && releases && releases.length === 0 && (
        <div className="card empty">No releases yet. Create one to start planning a deployment.</div>
      )}

      {!loading && !error && releases && releases.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Release Date</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/pm/releases/${r.id}`}>{r.version}</Link>
                    </td>
                    <td>
                      <span className="badge">{r.deployment_status}</span>
                    </td>
                    <td>{r.release_date ? new Date(r.release_date).toLocaleDateString() : '—'}</td>
                    <td>{r.summary ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}