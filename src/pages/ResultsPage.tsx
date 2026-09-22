import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Result, Team, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface ResultItem extends Result {
  teams?: Team;
}

export function ResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEditions() {
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .order('year', { ascending: false });

      if (edData && edData.length > 0) {
        setEditions(edData as Edition[]);
        const current = edData.find((e) => e.is_current) || edData[0];
        setSelectedEdition(current.id);
      }
    }
    loadEditions();
  }, []);

  useEffect(() => {
    async function loadResults() {
      if (!selectedEdition) return;
      setLoading(true);

      const { data: resData } = await supabase
        .from('results')
        .select(`
          *,
          teams:team_id (*)
        `)
        .eq('edition_id', selectedEdition)
        .eq('status', 'published')
        .order('position', { ascending: true });

      if (resData) setResults(resData as ResultItem[]);
      setLoading(false);
    }
    loadResults();
  }, [selectedEdition]);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Tournament Results</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
            Official certified results published by the Gen Code League Adjudication Committee.
          </p>
        </div>

        {/* Edition selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>EDITION:</label>
          <select
            className="form-select"
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading certified results..." />
      ) : results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {results.map((res) => (
            <div
              key={res.id}
              className="gcl-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                borderLeft: res.position === 1 ? '4px solid var(--gold)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: res.position === 1 ? 'var(--gold-subtle)' : 'var(--bg-elevated)',
                    color: res.position === 1 ? 'var(--gold)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  #{res.position}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                    {res.teams?.name || 'Squad Roster'}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Published: {res.published_at ? new Date(res.published_at).toLocaleDateString() : 'Official Record'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>
                  {res.score} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>PTS</span>
                </div>
                <Badge variant={res.position === 1 ? 'gold' : 'subtle'}>
                  {res.position === 1 ? 'LEAGUE CHAMPION' : `POSITION ${res.position}`}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Official final standings for this edition have not been certified yet. Check the live leaderboard for provisional rankings.
          </p>
        </div>
      )}
    </div>
  );
}
