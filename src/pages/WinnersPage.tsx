import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Winner, Team, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface WinnerItem extends Winner {
  teams?: Team;
  editions?: Edition;
}

export function WinnersPage() {
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWinners() {
      const { data } = await supabase
        .from('winners')
        .select(`
          *,
          teams:team_id (*),
          editions:edition_id (*)
        `)
        .order('created_at', { ascending: false });

      if (data) setWinners(data as WinnerItem[]);
      setLoading(false);
    }
    loadWinners();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="gold">CHAMPIONS ARCHIVE</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Hall of Fame</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Honoring the premier champions and podium squads across every edition of the Gen Code League.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading champions archive..." />
      ) : winners.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {winners.map((winner) => (
            <div
              key={winner.id}
              className="gcl-card"
              style={{
                borderTop: winner.position === 1 ? '3px solid var(--gold)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--gold)', fontWeight: 800 }}>
                    {winner.editions?.year || 2025}
                  </span>
                  <Badge variant={winner.position === 1 ? 'gold' : 'subtle'}>
                    {winner.position === 1 ? 'CHAMPION' : `RUNNER UP (#${winner.position})`}
                  </Badge>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{winner.teams?.name || 'Championship Squad'}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {winner.award || 'Championship Trophy & Distinction'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Season: {winner.editions?.name || 'Inaugural Season'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gold-subtle)', color: 'var(--gold)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            🏆
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Championship Trophies Pending</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9375rem' }}>
            Current season winners will be inducted into the permanent Hall of Fame following the conclusion of the Grand Finale.
          </p>
        </div>
      )}
    </div>
  );
}
