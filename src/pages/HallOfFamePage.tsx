import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Edition, Winner } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function HallOfFamePage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHallOfFame() {
      try {
        const [edRes, winRes] = await Promise.all([
          supabase.from('editions').select('*').order('year', { ascending: false }),
          supabase.from('winners').select('*, team:teams(*), edition:editions(*)').order('position', { ascending: true }),
        ]);

        if (edRes.data) setEditions(edRes.data as Edition[]);
        if (winRes.data) setWinners(winRes.data as Winner[]);
      } catch (err) {
        console.error('Failed to load hall of fame:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHallOfFame();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading GCL Hall of Fame..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
          <Badge variant="primary">PERMANENT LEAGUE ARCHIVE</Badge>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
          GCL Hall of Fame
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          Honoring the champions, technical titans, and historic record holders of the Gen Code League across all competition seasons.
        </p>
      </div>

      {/* Editions Historical Roll */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {editions.map((ed) => {
          const edWinners = winners.filter((w) => w.edition_id === ed.id);
          const champion = edWinners.find((w) => w.position === 1);

          return (
            <div
              key={ed.id}
              className="card"
              style={{
                padding: '2.5rem',
                border: ed.is_current ? '2px solid var(--border-gold)' : '1px solid var(--border-subtle)',
                background: ed.is_current
                  ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 17, 24, 0.95) 100%)'
                  : 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
                      {ed.name}
                    </h2>
                    {ed.is_current ? (
                      <Badge variant="live" pulse>ACTIVE SEASON</Badge>
                    ) : (
                      <Badge variant="subtle">ARCHIVED SEASON</Badge>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Year {ed.year} &bull; {ed.venue || 'Tech Arena'} &bull; {ed.status.toUpperCase()}
                  </p>
                </div>

                {champion && (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '1.75rem' }}>👑</span>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 800 }}>
                        Season Champion
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                        {champion.team?.name || 'Trophy Holder'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '800px', marginBottom: '1.5rem' }}>
                {ed.description || 'Premier technical league edition featuring collegiate competitors.'}
              </p>

              {/* Podium Breakdown if available */}
              {edWinners.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                  {edWinners.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>
                        {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Position #{w.position}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {w.team?.name || 'Competing Squad'}
                        </div>
                        {w.award && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>{w.award}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
