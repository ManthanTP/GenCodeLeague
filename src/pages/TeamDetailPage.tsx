import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Team, TeamMember, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeamData() {
      if (!id) return;
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamData) {
        setTeam(teamData as Team);

        // Fetch edition
        const { data: edData } = await supabase
          .from('editions')
          .select('*')
          .eq('id', teamData.edition_id)
          .single();
        if (edData) setEdition(edData as Edition);

        // Fetch team members directly
        const { data: membersData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .order('is_leader', { ascending: false });

        if (membersData) setMembers(membersData as TeamMember[]);
      }
      setLoading(false);
    }
    loadTeamData();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <LoadingSpinner size="lg" text="Loading team roster..." />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Team Not Found</h2>
        <p style={{ margin: '1rem 0 2rem 0', color: 'var(--text-secondary)' }}>
          This team does not exist or has not been published yet.
        </p>
        <Link to="/teams">
          <Button variant="outline">Back to Teams</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Link to="/teams" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            &larr; All Teams
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <Badge
            variant={
              team.status === 'qualified'
                ? 'qualified'
                : team.status === 'winner'
                ? 'gold'
                : team.status === 'eliminated'
                ? 'eliminated'
                : 'subtle'
            }
          >
            {team.status.toUpperCase()}
          </Badge>
          {team.rank && (
            <Badge variant="gold">
              RANK #{team.rank}
            </Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '1.75rem',
              color: 'var(--gold)',
            }}
          >
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>{team.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Season: {edition?.name || 'GCL Season'} &bull; {team.college || 'Institution Configured'} {team.department ? `(${team.department})` : ''}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Score: </span>
            <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: '1.125rem' }}>
              {team.score ?? 0} pts
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Roster Size: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{members.length} Competitors</strong>
          </div>
          {team.college && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>College: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{team.college}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Roster Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Official Squad Roster</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            PRD v3.0 Verified Competitors
          </span>
        </div>

        {members.length > 0 ? (
          <div className="table-responsive">
            <table className="gcl-table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Role</th>
                  <th>USN / ID</th>
                  <th>Institution</th>
                  <th>Department / Sem</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: member.is_leader ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-elevated)',
                            color: member.is_leader ? 'var(--gold)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {member.full_name ? member.full_name.slice(0, 2).toUpperCase() : 'M'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.full_name || 'Anonymous Competitor'}
                          </div>
                          {member.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={member.is_leader ? 'gold' : 'subtle'}>
                        {member.is_leader ? 'TEAM LEADER' : (member.role || 'MEMBER').toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                        {member.usn || '—'}
                      </span>
                    </td>
                    <td>{member.college || team.college || '—'}</td>
                    <td>
                      {member.department || team.department || '—'}
                      {member.semester ? ` (Sem ${member.semester})` : ''}
                    </td>
                    <td>
                      <Badge variant={member.status === 'active' ? 'qualified' : 'subtle'}>
                        {(member.status || 'active').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Squad members are currently finalizing verification with team leadership.
          </div>
        )}
      </section>
    </div>
  );
}
