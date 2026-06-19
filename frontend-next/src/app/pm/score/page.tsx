'use client';

import { useEffect, useState } from 'react';
import { api, ScoreSummary } from '@/lib/api';

export default function ScorePage() {
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .score()
      .then(setScore)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load score'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Score System</div>
          <h1>Engineering action score</h1>
          <p>Starter score page. Interns should integrate score events into useful workspace actions.</p>
        </div>
      </div>
      {loading ? <div className="card">Loading score...</div> : null}
      {error ? <div className="card error">{error}</div> : null}

      {!loading && (
        <>
          <div className="card">
            <h2>Total Points</h2>
            <p style={{ fontSize: 42, color: 'var(--navy)', fontWeight: 900, margin: 0 }}>{score?.total ?? 0}</p>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h2>Recent Events</h2>
            {score?.events.length ? (
              score.events.map((event) => <p key={event.id}>{event.action}: +{event.points}</p>)
            ) : (
              <p>No score events yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
