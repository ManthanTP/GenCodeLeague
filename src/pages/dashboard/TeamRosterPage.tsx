import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { TeamRosterItem } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function TeamRosterPage() {
  const { team } = useAuth();
  const [roster, setRoster] = useState<TeamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoster() {
      if (!team?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('team_roster')
          .select('*, item:auction_items(*)')
          .eq('team_id', team.id)
          .order('created_at', { ascending: false });

        if (data) setRoster(data as unknown as TeamRosterItem[]);
      } catch (err) {
        console.error('Failed to load team roster:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoster();
  }, [team?.id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading Team Roster & Inventory..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Acquired Inventory & Roster
          </h1>
          <Badge variant="primary">{roster.length} Lots Acquired</Badge>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Assets, engineers, and technical blueprints secured by {team?.name || 'your team'} during official auctions.
        </p>
      </div>

      {roster.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: '0 0 0.5rem 0' }}>
            No Auction Assets Acquired Yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
            When the auction commences, lots secured by your squad will appear in this official inventory.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {roster.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-gold)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <Badge variant="subtle">{item.item?.category || 'Specialist'}</Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--gold)', fontSize: '1.125rem' }}>
                    {item.purchase_price} cr
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: '0 0 0.5rem 0' }}>
                  {item.item?.name || 'Acquired Asset'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {item.item?.description || 'Verified tournament asset.'}
                </p>
                {item.item?.skills && item.item.skills.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {item.item.skills.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Acquired on {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
