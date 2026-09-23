import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Team, TeamMember, Edition, TeamRosterItem, EventState } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatINR } from '../../lib/currency';

export function TeamDashboard() {
  const { user, profile, team: authTeam } = useAuth();
  const [team, setTeam] = useState<Team | null>(authTeam || null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [roster, setRoster] = useState<TeamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel('team-dashboard-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadDashboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, authTeam?.id]);

  async function loadDashboard() {
    setLoading(true);
    try {
      if (!user) return;

      const { data: teamData } = await supabase
        .from('teams')
        .select('*, edition:editions(*)')
        .or(`team_leader_id.eq.${user.id},captain_id.eq.${user.id}`)
        .maybeSingle();

      if (teamData) {
        setTeam(teamData as unknown as Team);

        const { data: memData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .order('joined_at', { ascending: true });

        if (memData) setMembers(memData as TeamMember[]);

        const { data: rosData } = await supabase
          .from('team_roster')
          .select('*, item:auction_items(*)')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false });

        if (rosData) setRoster(rosData as unknown as TeamRosterItem[]);
      }

      const { data: stateData } = await supabase
        .from('event_state')
        .select('*, current_round:rounds(*)')
        .limit(1)
        .maybeSingle();

      if (stateData) setEventState(stateData as EventState);
    } catch (err) {
      console.error('Failed to load team dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading Team Terminal..." />
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="gcl-card" style={{ padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            No Assigned Team Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Your account is not linked to an active competing team.
          </p>
          <Link to="/">
            <Button variant="secondary" size="md">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Team Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Team Status
          </div>
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {team.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Budget</div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-green)' }}>
              {formatINR(team.remaining_budget)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Score</div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {team.score} pts
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Banner */}
      {eventState?.state === 'LIVE' ? (
        <div
          className="gcl-card"
          style={{
            padding: '2rem',
            border: '2px solid var(--accent-red)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.1)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Badge variant="live" pulse>LIVE</Badge>
              <strong style={{ fontSize: '1.25rem' }}>{eventState.current_round?.name || 'Active Challenge'}</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              {eventState.banner_message || 'The competition is active. Awaiting your instructions.'}
            </p>
          </div>

          <Link to="/team/competition" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg" style={{ fontWeight: 800 }}>
              Enter Live Arena &rarr;
            </Button>
          </Link>
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '2rem', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Event Offline</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Wait for the Admin to begin the event.</p>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Squad Members */}
        <div className="gcl-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="gcl-card__title">Squad Roster ({members.length})</h2>
            <Link to="/team/members">
              <Button variant="outline" size="sm">Edit Squad</Button>
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.full_name} {m.is_leader && <Badge variant="primary">LEADER</Badge>}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.usn || 'N/A'}</div>
                </div>
                <Badge variant="subtle">{m.role}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Acquired Lots */}
        <div className="gcl-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="gcl-card__title">Acquired Lots ({roster.length})</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roster.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                No lots acquired yet.
              </div>
            ) : (
              roster.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{(r.item as any)?.name || 'Unknown Lot'}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.875rem' }}>
                    -{formatINR(r.purchase_price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
