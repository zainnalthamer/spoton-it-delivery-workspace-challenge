'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Release, WorkItem } from '@/lib/api';

export default function ReleaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [release, setRelease] = useState<Release | null>(null);
  const [readyItems, setReadyItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [linking, setLinking] = useState(false);
  const [deploying, setDeploying] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([api.release(id), api.workItems({ status: 'ready_for_release' })])
      .then(([releaseData, ready]) => {
        setRelease(releaseData);
        setReadyItems(ready);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load release'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) return;
    setLinking(true);
    setError('');
    try {
      await api.linkWorkItem(id, selectedItemId);
      setSelectedItemId('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link work item');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(workItemId: string) {
    setError('');
    try {
      await api.unlinkWorkItem(id, workItemId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink work item');
    }
  }

  async function handleDeploy() {
    if (!confirm('Deploy this release? Linked work items will be marked as released.')) return;
    setDeploying(true);
    setError('');
    try {
      const updated = await api.deployRelease(id);
      setRelease(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy release');
    } finally {
      setDeploying(false);
    }
  }

  if (loading) return <section><div className="card">Loading release...</div></section>;
  if (error && !release) {
    return (
      <section>
        <div className="card error">{error}</div>
        <Link href="/pm/releases" className="button secondary" style={{ marginTop: 12, display: 'inline-block' }}>
          Back to Releases
        </Link>
      </section>
    );
  }

  const isDeployed = release?.deployment_status === 'deployed';
  const linkedIds = new Set((release?.linkedWorkItems ?? []).map((w) => w.id));
  const availableToLink = readyItems.filter((w) => !linkedIds.has(w.id));

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>{release?.version}</h1>
          <p>{release?.summary ?? 'No summary provided.'}</p>
        </div>
        <Link href="/pm/releases" className="button secondary">
          Back to Releases
        </Link>
      </div>

      {error && <div className="card error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Status:</strong> <span className="badge">{release?.deployment_status}</span>
          </div>
          <button className="button" onClick={handleDeploy} disabled={deploying || isDeployed}>
            {isDeployed ? 'Already Deployed' : deploying ? 'Deploying...' : 'Deploy Release'}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h2>What Shipped</h2>
        {(!release?.linkedWorkItems || release.linkedWorkItems.length === 0) && (
          <p>No work items linked yet.</p>
        )}
        {release?.linkedWorkItems && release.linkedWorkItems.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                {!isDeployed && <th></th>}
              </tr>
            </thead>
            <tbody>
              {release.linkedWorkItems.map((w) => (
                <tr key={w.id}>
                  <td><Link href={`/pm/it-workspace/${w.id}`}>{w.title}</Link></td>
                  <td><span className="badge">{w.status}</span></td>
                  {!isDeployed && (
                    <td>
                      <button
                        type="button"
                        onClick={() => handleUnlink(w.id)}
                        style={{ border: 0, background: 'none', color: '#b42318', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Unlink
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isDeployed && (
          <form onSubmit={handleLink} style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="workItem">Link a ready work item</label>
              <select id="workItem" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                <option value="">Select a work item...</option>
                {availableToLink.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
            <button className="button secondary" type="submit" disabled={linking || !selectedItemId}>
              {linking ? 'Linking...' : 'Link'}
            </button>
          </form>
        )}

        {!isDeployed && availableToLink.length === 0 && readyItems.length === 0 && (
          <p style={{ marginTop: 12 }}>
            No work items are currently ready_for_release. Move items through QA first.
          </p>
        )}
      </div>
    </section>
  );
}