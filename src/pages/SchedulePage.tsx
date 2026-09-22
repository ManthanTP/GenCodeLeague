import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Schedule, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (edData) {
        setEdition(edData as Edition);
        const { data: schData } = await supabase
          .from('schedules')
          .select('*')
          .eq('edition_id', edData.id)
          .order('sort_order', { ascending: true });

        if (schData) setSchedules(schData as Schedule[]);
      }
      setLoading(false);
    }
    loadSchedule();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Badge variant="live" pulse>EVENT TIMELINE</Badge>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{edition?.name || 'GCL 2026'}</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Championship Schedule</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Comprehensive timeline for team check-in, elimination rounds, auction gameplay, engineering sprints, and awards ceremonies.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading tournament itinerary..." />
      ) : schedules.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {schedules.map((item) => (
            <div key={item.id} className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                  {item.start_time} - {item.end_time}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.description}</p>
                </div>
              </div>
              <Badge variant={item.status === 'live' ? 'live' : item.status === 'completed' ? 'subtle' : 'gold'}>
                {item.status.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Representative Official Schedule */}
          <div className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                09:00 - 09:45
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Delegate Check-In & Tech Verification</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Credential verification, device environment inspection, and team seating.</p>
              </div>
            </div>
            <Badge variant="subtle">UPCOMING</Badge>
          </div>

          <div className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                10:00 - 10:45
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Stage 1: Elimination Quiz Challenge</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Synchronized multi-choice and algorithmic logic examination.</p>
              </div>
            </div>
            <Badge variant="subtle">UPCOMING</Badge>
          </div>

          <div className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                11:15 - 12:30
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Stage 2: Live Technical Auction</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Real-time squad bidding console for technical assets and specialist modifiers.</p>
              </div>
            </div>
            <Badge variant="subtle">UPCOMING</Badge>
          </div>

          <div className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                13:30 - 16:30
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Stage 3: Engineering Sprint & Testing</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Hands-on coding showdown with automated unit-test score feeds.</p>
              </div>
            </div>
            <Badge variant="subtle">UPCOMING</Badge>
          </div>

          <div className="gcl-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 700, minWidth: '120px' }}>
                17:00 - 18:00
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Finals Adjudication & Trophy Ceremony</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Champion crowning, prize distribution, and digital certificate activation.</p>
              </div>
            </div>
            <Badge variant="gold">GRAND CEREMONY</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
