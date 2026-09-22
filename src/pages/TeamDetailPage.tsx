import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Team, TeamMember, Profile, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

interface MemberWithProfile extends TeamMember {
  profiles?: Profile;
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
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

        // Fetch team members with profile
        const { data: membersData } = await supabase
          .from('team_members')
          .select(`
            *,
            profiles:profile_id (*)
          `)
          .eq('team_id', teamData.id);

        if (membersData) setMembers(membersData as MemberWithProfile[]);
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '1.5rem',
              color: 'var(--gold)',
            }}
          >
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>{team.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Season: {edition?.name || 'GCL Season'} &bull; Status: {team.status}
            </p>
          </div>
        </div>
      </div>

      {/* Roster Section */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Official Squad Roster</h2>
        {members.length > 0 ? (
          <div className="table-responsive">
            <table className="gcl-table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Role</th>
                  <th>Institution</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {member.profiles?.full_name || 'Anonymous Competitor'}
                      </div>
                    </td>
                    <td>
                      <Badge variant={member.role === 'captain' ? 'gold' : 'subtle'}>
                        {member.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td>{member.profiles?.college || 'Institution Configured'}</td>
                    <td>{member.profiles?.department || 'Engineering'}</td>
                    <td>
                      <Badge variant={member.status === 'active' ? 'qualified' : 'subtle'}>
                        {member.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Squad members are currently finalizing verification with team leadership.
          </div>
        )}
      </section>
    </div>
  );
}
