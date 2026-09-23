import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/currency';
import { Button } from '../ui/Button';

interface AggregateStats {
  totalSpent: number;
  totalAvailable: number;
  teamsCount: number;
}

export function Navbar() {
  const { isAuthenticated, isAdmin, isTeamLeader, signOut } = useAuth();
  const [stats, setStats] = useState<AggregateStats>({
    totalSpent: 0,
    totalAvailable: 0,
    teamsCount: 0,
  });
  const [eventStatus, setEventStatus] = useState<string>('NOT_STARTED');

  useEffect(() => {
    loadStats();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('navbar-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadStats() {
    try {
      // Get current edition
      const { data: edition } = await supabase
        .from('editions')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (edition) {
        // Get team aggregates
        const { data: teams } = await supabase
          .from('teams')
          .select('total_spent, remaining_budget')
          .eq('edition_id', edition.id);

        if (teams) {
          const totalSpent = teams.reduce((sum, t) => sum + (t.total_spent || 0), 0);
          const totalAvailable = teams.reduce((sum, t) => sum + (t.remaining_budget || 0), 0);
          setStats({
            totalSpent,
            totalAvailable,
            teamsCount: teams.length,
          });
        }
      }

      // Get event state
      const { data: eventState } = await supabase
        .from('event_state')
        .select('status')
        .limit(1)
        .maybeSingle();

      if (eventState?.status) {
        setEventStatus(eventState.status);
      }
    } catch {
      // Silently handle errors — stats are non-critical
    }
  }

  const isLive = ['LIVE', 'AUCTION', 'QUIZ', 'TIE_BREAKER'].includes(eventStatus);

  return (
    <header className="gcl-stats-bar">
      <div className="container">
        {/* Left: Brand + Live Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" className="gcl-stats-bar__brand">
            <div className="gcl-stats-bar__brand-icon">⚡</div>
            <span>GEN CODE LEAGUE</span>
          </Link>

          <span className="gcl-stats-bar__live-badge">
            <span className="gcl-stats-bar__live-dot" />
            {isLive ? 'LIVE AUCTION' : 'LIVE AUCTION'}
          </span>
        </div>

        {/* Center: Metrics */}
        <div className="gcl-stats-bar__metrics">
          <div className="gcl-stats-bar__metric">
            <span className="gcl-stats-bar__metric-label">Total Spent</span>
            <span className="gcl-stats-bar__metric-value gcl-stats-bar__metric-value--spent">
              {formatINR(stats.totalSpent)}
            </span>
          </div>
          <div className="gcl-stats-bar__metric">
            <span className="gcl-stats-bar__metric-label">Total Available</span>
            <span className="gcl-stats-bar__metric-value gcl-stats-bar__metric-value--available">
              {formatINR(stats.totalAvailable)}
            </span>
          </div>
          <div className="gcl-stats-bar__metric">
            <span className="gcl-stats-bar__metric-label">Teams</span>
            <span className="gcl-stats-bar__metric-value gcl-stats-bar__metric-value--teams">
              👥 {stats.teamsCount}
            </span>
          </div>
        </div>

        {/* Right: Auth actions */}
        <div className="gcl-stats-bar__actions">
          {isAuthenticated ? (
            <>
              {(isAdmin || isTeamLeader) && (
                <Link to="/live" target="_blank" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm">
                    👁 Live View
                  </Button>
                </Link>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => signOut()}
              >
                🔒 Logout
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
