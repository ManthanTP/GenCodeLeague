import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Team, TeamMember, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ParticipantDashboard() {
  const { profile, user, role, isCaptain, isAdmin } = useAuth();
  const [membership, setMembership] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      // 1. Fetch current edition
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();
      if (edData) setCurrentEdition(edData as Edition);

      // 2. Fetch user's team membership
      if (user) {
        const { data: memData } = await supabase
          .from('team_members')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (memData) {
          setMembership(memData as TeamMember);
          // Fetch team details
          const { data: teamData } = await supabase
            .from('teams')
            .select('*')
            .eq('id', memData.team_id)
            .single();
          if (teamData) setTeam(teamData as Team);
        }
      }
      setLoading(false);
    }
    loadDashboard();
  }, [user]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading competitor profile..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Competitor Profile Overview Card */}
      <div
        className="gcl-card"
        style={{
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-default)',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Badge variant={isAdmin ? 'gold' : isCaptain ? 'live' : 'subtle'}>
                {role?.toUpperCase() || 'PARTICIPANT'}
              </Badge>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ID: {user?.id.slice(0, 8)}...
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
              {profile?.full_name || 'Competitor'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              {profile?.college || 'Academic Institution Unset'} &bull; {profile?.department || 'Department Unset'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isCaptain && (
              <Link to="/team/certificates">
                <Button variant="primary" size="sm">
                  Generate Team Certificates &rarr;
                </Button>
              </Link>
            )}
            <Link to="/team">
              <Button variant="secondary" size="sm">
                Squad Console
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Account</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              {profile?.email || user?.email}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>USN / Enrollment</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              {profile?.usn || 'Not Specified'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Squad</div>
            <div style={{ color: team ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              {team?.name || 'Not assigned to a team yet.'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Season</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              {currentEdition?.name || 'GCL 2026'}
            </div>
          </div>
        </div>
      </div>

      {/* Team & Competition Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Squad Status */}
        <div className="gcl-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Squad Membership</h3>
          {team ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{team.name}</span>
                <Badge variant={team.status === 'qualified' ? 'qualified' : team.status === 'eliminated' ? 'eliminated' : 'subtle'}>
                  {team.status.toUpperCase()}
                </Badge>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                You are registered as <strong>{membership?.role.toUpperCase()}</strong> for this squad.
              </p>
              <Link to="/team">
                <Button variant="outline" size="sm">Manage Squad Roster &rarr;</Button>
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                You are not currently enrolled in a competitive squad for {currentEdition?.name || 'GCL 2026'}. You can create or join an approved roster in the team portal.
              </p>
              <Link to="/team">
                <Button variant="primary" size="sm">Create or Join Squad</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Competition Actions */}
        <div className="gcl-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Tournament Action Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to="/rounds"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <span>Review Competition Rounds</span>
              <span style={{ color: 'var(--gold)' }}>&rarr;</span>
            </Link>

            <Link
              to="/team/auction"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <span>Live Auction Bidding Room</span>
              <Badge variant="live" pulse>LIVE CONSOLE</Badge>
            </Link>

            <Link
              to="/verify/check"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <span>Verify Official Credentials</span>
              <span style={{ color: 'var(--gold)' }}>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
