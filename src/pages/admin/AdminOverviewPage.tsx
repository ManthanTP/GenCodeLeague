import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Edition, Team } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatINR } from '../../lib/currency';

export function AdminOverviewPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadConfiguration();
  }, []);

  async function loadConfiguration() {
    const { data: edData } = await supabase
      .from('editions')
      .select('*')
      .eq('is_current', true)
      .maybeSingle();

    if (edData) {
      setCurrentEdition(edData as Edition);

      const { data: tData } = await supabase
        .from('teams')
        .select('*')
        .eq('edition_id', edData.id)
        .order('created_at', { ascending: true });

      if (tData) {
        setTeams(tData as Team[]);
      }
    }
    setLoading(false);
  }

  async function startLiveAuction() {
    if (!currentEdition) return;
    setActionLoading(true);
    try {
      await supabase
        .from('event_state')
        .update({
          state: 'INITIALIZED',
          banner_message: 'Auction will begin shortly',
          timer_state: 'stopped'
        })
        .eq('id', 1);
      
      navigate('/admin/live-control');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading event configuration..." />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="gcl-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 className="gcl-card__title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              Event Configuration
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {currentEdition?.name || 'No Active Edition'}
            </div>
          </div>
          <Badge variant="live">READY</Badge>
        </div>

        {/* Budget Config */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Starting Budget</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{formatINR(currentEdition?.starting_budget || 0)}</span>
          </label>
          <input
            type="number"
            className="form-input form-input--mono"
            value={currentEdition?.starting_budget || 0}
            disabled
            style={{ fontSize: '1.25rem', padding: '0.75rem' }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Configure in Editions settings
          </div>
        </div>

        {/* Teams Config */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Teams ({teams.length})</label>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/teams')}>
              + Add Team
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            {teams.map((team, idx) => (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span style={{ fontWeight: 600 }}>{team.name}</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => navigate(`/admin/teams?delete=${team.id}`)}>
                  -
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Start Action */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={actionLoading}
          onClick={startLiveAuction}
          style={{ fontSize: '1.125rem', padding: '1rem' }}
        >
          ▶ Start Live Auction
        </Button>
      </div>

    </div>
  );
}
