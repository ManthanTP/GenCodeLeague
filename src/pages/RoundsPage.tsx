import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Round, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';

export function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRounds() {
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (edData) {
        setEdition(edData as Edition);
        const { data: roundData } = await supabase
          .from('rounds')
          .select('*')
          .eq('edition_id', edData.id)
          .order('sort_order', { ascending: true });

        if (roundData) setRounds(roundData as Round[]);
      }
      setLoading(false);
    }
    loadRounds();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Badge variant="live" pulse>ACTIVE SEASON</Badge>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{edition?.name || 'GCL 2026'}</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Competition Rounds</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
          Multi-phase elimination and championship architecture. Each round evaluates discrete software competencies, team chemistry, and rapid problem-solving.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading rounds..." />
      ) : rounds.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {rounds.map((round) => (
            <div key={round.id} className="gcl-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--gold)', fontWeight: 700 }}>
                    ROUND {round.sort_order.toString().padStart(2, '0')}
                  </span>
                  <Badge variant={round.status === 'live' ? 'live' : round.status === 'completed' ? 'subtle' : 'gold'} pulse={round.status === 'live'}>
                    {round.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{round.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {round.description || 'Championship stage evaluation.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>Format: <strong style={{ color: 'var(--text-primary)' }}>{round.type.toUpperCase()}</strong></span>
                <span>Duration: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{round.duration_minutes}m</strong></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Representative Standard GCL Tournament Structure */}
          <div className="gcl-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700 }}>STAGE 01</span>
              <Badge variant="gold">ELIMINATION</Badge>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Algorithmic Quiz</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Rapid multiple-choice and code-tracing challenges under strict countdown conditions. Top percentile squads advance to the draft.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Format: Timed Quiz &bull; Duration: 45m
            </div>
          </div>

          <div className="gcl-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700 }}>STAGE 02</span>
              <Badge variant="live">LIVE EVENT</Badge>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Technical Auction</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Live bidding room where captains allocate virtual budgets to secure premium tech stacks, specialist talent, and defensive modifiers.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Format: Live Auction &bull; Real-time Console
            </div>
          </div>

          <div className="gcl-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700 }}>STAGE 03</span>
              <Badge variant="subtle">UPCOMING</Badge>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Engineering Sprint</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Intensive coding sprint addressing real-world architectural and algorithmic problem statements.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Format: Coding Challenge &bull; Duration: 180m
            </div>
          </div>

          <div className="gcl-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700 }}>STAGE 04</span>
              <Badge variant="subtle">UPCOMING</Badge>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Championship Final</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Grand finals presentation and live test suite execution before the league adjudicators.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Format: Final Presentation &bull; Live Adjudication
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
