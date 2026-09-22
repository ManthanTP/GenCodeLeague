import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEditions() {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .order('year', { ascending: false });

      if (data) setEditions(data as Edition[]);
      setLoading(false);
    }
    fetchEditions();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>GCL Editions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px' }}>
          Explore current and historical seasons of the Gen Code League. Each edition features independent tournament brackets, team rosters, and competition archives.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading league editions..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {editions.map((edition) => (
            <div
              key={edition.id}
              className="gcl-card interactive"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)' }}>
                    {edition.year}
                  </span>
                  <Badge variant={edition.is_current ? 'live' : 'subtle'} pulse={edition.is_current}>
                    {edition.is_current ? 'ACTIVE SEASON' : edition.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{edition.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {edition.description || 'Championship season of Gen Code League.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <span>Venue: {edition.venue || 'TBA'}</span>
                  <span>{edition.event_date || 'Date TBA'}</span>
                </div>
                <Link
                  to={`/editions/${edition.year}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    color: 'var(--gold)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  View Season Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
