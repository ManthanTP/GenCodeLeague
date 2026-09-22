import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Team, TeamMember, Edition, TeamBudget, Profile } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface MemberWithProfile extends TeamMember {
  profiles?: Profile;
}

export function TeamDashboard() {
  const { user, profile, isCaptain } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [budget, setBudget] = useState<TeamBudget | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  // New team creation form state
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, [user]);

  async function loadTeamData() {
    setLoading(true);
    // Fetch current active edition
    const { data: edData } = await supabase
      .from('editions')
      .select('*')
      .eq('is_current', true)
      .single();
    if (edData) setEdition(edData as Edition);

    if (user && edData) {
      // Find user's team membership
      const { data: memData } = await supabase
        .from('team_members')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (memData) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', memData.team_id)
          .single();

        if (teamData) {
          setTeam(teamData as Team);

          // Fetch all members of this team
          const { data: allMembers } = await supabase
            .from('team_members')
            .select(`
              *,
              profiles:profile_id (*)
            `)
            .eq('team_id', teamData.id);

          if (allMembers) setMembers(allMembers as MemberWithProfile[]);

          // Fetch team budget
          const { data: budgetData } = await supabase
            .from('team_budgets')
            .select('*')
            .eq('team_id', teamData.id)
            .maybeSingle();

          if (budgetData) setBudget(budgetData as TeamBudget);
        }
      }
    }
    setLoading(false);
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !edition || !newTeamName.trim()) return;

    setCreatingTeam(true);
    setTeamError(null);

    try {
      // 1. Insert team
      const { data: createdTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          edition_id: edition.id,
          captain_id: user.id,
          status: 'registered',
        })
        .select()
        .single();

      if (teamErr) throw teamErr;

      // 2. Insert team_member as captain
      const { error: memErr } = await supabase
        .from('team_members')
        .insert({
          team_id: createdTeam.id,
          profile_id: user.id,
          role: 'captain',
          status: 'active',
        });

      if (memErr) throw memErr;

      // 3. Update profile role to captain
      await supabase
        .from('profiles')
        .update({ role: 'captain' })
        .eq('id', user.id);

      // Reload
      await loadTeamData();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to create team. Ensure team name is unique.');
    } finally {
      setCreatingTeam(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading team dashboard..." />;
  }

  if (!team) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="gcl-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              color: 'var(--gold)',
              margin: '0 auto 1.5rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            🛡
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>No Squad Affiliation Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            You are not enrolled in a squad for <strong>{edition?.name || 'GCL 2026'}</strong>. As an aspiring captain, you can register your squad now and recruit teammates.
          </p>

          {teamError && (
            <div style={{ padding: '0.75rem', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {teamError}
            </div>
          )}

          <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Squad / Team Name</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Apex Bytecode Syndicate"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" isLoading={creatingTeam} style={{ marginTop: '0.5rem' }}>
              Register Squad as Captain
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Squad Header Card */}
      <div
        className="gcl-card"
        style={{
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-default)',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Badge variant={team.status === 'qualified' ? 'qualified' : team.status === 'eliminated' ? 'eliminated' : 'subtle'}>
                  {team.status.toUpperCase()}
                </Badge>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Season: {edition?.name || 'GCL 2026'}
                </span>
              </div>
              <h1 style={{ fontSize: '2rem' }}>{team.name}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isCaptain && (
              <Link to="/team/certificates">
                <Button variant="primary" size="sm">
                  Generate Member Certificates &rarr;
                </Button>
              </Link>
            )}
            <Link to="/team/auction">
              <Button variant="secondary" size="sm">
                Live Auction Console
              </Button>
            </Link>
          </div>
        </div>

        {/* Squad Telemetry Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Auction Budget</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
              ${budget ? budget.current_budget.toLocaleString() : '10,000'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Spent: ${budget ? budget.amount_spent.toLocaleString() : '0'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Roster Size</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {members.length} Competitors
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Authorization</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: isCaptain ? 'var(--gold)' : 'var(--text-primary)', marginTop: '0.5rem' }}>
              {isCaptain ? '★ TEAM CAPTAIN' : 'SQUAD MEMBER'}
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem' }}>Squad Roster</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>All registered competitors authorized to represent {team.name}</p>
          </div>
          {isCaptain && (
            <Link to="/team/members">
              <Button variant="outline" size="sm">Manage Members &rarr;</Button>
            </Link>
          )}
        </div>

        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th>Role</th>
                <th>Institution</th>
                <th>Department</th>
                <th>Status</th>
                {isCaptain && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {member.profiles?.full_name || 'Competitor'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.profiles?.email}
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
                  {isCaptain && (
                    <td>
                      <Link to={`/team/certificates?memberId=${member.profile_id}`}>
                        <Button variant="outline" size="sm">
                          Issue Certificate
                        </Button>
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
