import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Team, TeamMember, Edition, TeamRosterItem, ScoreEntry, EventState } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function TeamDashboard() {
  const { user, profile, team: authTeam } = useAuth();
  const [team, setTeam] = useState<Team | null>(authTeam || null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [roster, setRoster] = useState<TeamRosterItem[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreEntry[]>([]);
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

      // 1. Fetch team for this user
      const { data: teamData } = await supabase
        .from('teams')
        .select('*, edition:editions(*)')
        .or(`team_leader_id.eq.${user.id},captain_id.eq.${user.id}`)
        .maybeSingle();

      if (teamData) {
        setTeam(teamData as unknown as Team);
        if (teamData.edition) {
          setEdition(teamData.edition as unknown as Edition);
        }

        // 2. Fetch members
        const { data: memData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .order('joined_at', { ascending: true });

        if (memData) setMembers(memData as TeamMember[]);

        // 3. Fetch purchased roster
        const { data: rosData } = await supabase
          .from('team_roster')
          .select('*, item:auction_items(*)')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false });

        if (rosData) setRoster(rosData as unknown as TeamRosterItem[]);

        // 4. Fetch recent scores
        const { data: scrData } = await supabase
          .from('scores')
          .select('*')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (scrData) setRecentScores(scrData as ScoreEntry[]);
      }

      // 5. Fetch live event state
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
      <div className="container" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading Team Leader Console..." />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            No Assigned Team Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Your account ({profile?.email}) is not currently linked to an active competing team. Please contact your college coordinator or tournament administrator.
          </p>
          <Link to="/">
            <Button variant="secondary" size="md">
              Return to League Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Live Event Banner */}
      {eventState?.state === 'LIVE' && (
        <div
          className="card"
          style={{
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Badge variant="live" pulse>
                COMPETITION ROUND IS LIVE NOW
              </Badge>
              <strong style={{ fontSize: '1rem' }}>{eventState.current_round?.name || 'Active Challenge'}</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              {eventState.banner_message || 'Official answers must be submitted by the Team Leader before the countdown expires.'}
            </p>
          </div>

          <Link to="/team/competition" style={{ textDecoration: 'none' }}>
            <Button variant="gold" size="lg" style={{ fontWeight: 800 }}>
              ⚡ Enter Live Arena Now &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Score Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Official Tournament Score
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--gold)', margin: '0.25rem 0' }}>
            {team.score} <span style={{ fontSize: '1rem' }}>pts</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Standing Rank: <strong>#{team.rank || '—'}</strong>
          </div>
        </div>

        {/* Budget Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Remaining Credits
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399', margin: '0.25rem 0' }}>
            {team.remaining_budget} <span style={{ fontSize: '1rem' }}>cr</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Total Invested: <strong>{team.total_spent} credits</strong>
          </div>
        </div>

        {/* Squad Members Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Registered Squad
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
            {members.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>members</span>
          </div>
          <div style={{ fontSize: '0.8125rem' }}>
            <Link to="/team/members" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              Manage Squad Records &rarr;
            </Link>
          </div>
        </div>

        {/* Inventory Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acquired Auction Lots
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#818cf8', margin: '0.25rem 0' }}>
            {roster.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>lots</span>
          </div>
          <div style={{ fontSize: '0.8125rem' }}>
            <Link to="/team/roster" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              View Inventory &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Squad List & Score History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Squad Members Section */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Official Squad Roster
            </h2>
            <Link to="/team/members">
              <Button variant="outline" size="sm">
                Edit Squad
              </Button>
            </Link>
          </div>

          {members.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No squad members added yet. Click "Edit Squad" to add your team members.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {m.full_name} {m.is_leader && <Badge variant="gold">LEADER</Badge>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      USN: {m.usn || 'N/A'} {m.department && `• ${m.department}`}
                    </div>
                  </div>
                  <Badge variant="subtle">{m.role.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score History Section */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>
            Traceable Scoring History
          </h2>

          {recentScores.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No score transactions recorded for your squad yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentScores.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {s.reason || 'Competition Score Update'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Source: {s.source.toUpperCase()} &bull; {new Date(s.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '1.125rem',
                      color: Number(s.points) >= 0 ? '#34d399' : '#ef4444',
                    }}
                  >
                    {Number(s.points) >= 0 ? `+${s.points}` : s.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
