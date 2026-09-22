import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { TeamMember, Profile, Team } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface MemberWithProfile extends TeamMember {
  profiles?: Profile;
}

export function TeamMembersPage() {
  const { user, isCaptain } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite member form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadMembers();
  }, [user]);

  async function loadMembers() {
    setLoading(true);
    if (!user) return;

    // Get user's team
    const { data: memData } = await supabase
      .from('team_members')
      .select('*, teams:team_id (*)')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (memData?.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memData.team_id)
        .single();
      if (teamData) setTeam(teamData as Team);

      const { data: allMembers } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:profile_id (*)
        `)
        .eq('team_id', memData.team_id);

      if (allMembers) setMembers(allMembers as MemberWithProfile[]);
    }
    setLoading(false);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !inviteEmail.trim()) return;

    setInviting(true);
    setMsg(null);

    try {
      // Find profile by email
      const { data: profileData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', inviteEmail.trim().toLowerCase())
        .maybeSingle();

      if (profErr || !profileData) {
        throw new Error('No registered competitor found with that email address. Ask them to register first.');
      }

      // Check if already in a team
      const { data: existingMem } = await supabase
        .from('team_members')
        .select('*')
        .eq('profile_id', profileData.id)
        .maybeSingle();

      if (existingMem) {
        throw new Error('This competitor is already enrolled in a squad for this season.');
      }

      // Add to team
      const { error: insertErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          profile_id: profileData.id,
          role: 'member',
          status: 'active',
        });

      if (insertErr) throw insertErr;

      setMsg({ type: 'success', text: `Successfully inducted ${profileData.full_name || profileData.email} into squad!` });
      setInviteEmail('');
      await loadMembers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to add member to team.' });
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading squad members..." />;
  }

  if (!team) {
    return (
      <div className="gcl-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Squad Configured</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Please create or join a squad from the main Team tab first.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{team.name} &bull; Squad Roster</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage certified competitors and team roles for {team.name}.
        </p>
      </div>

      {isCaptain && (
        <div className="gcl-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Induct Registered Competitor</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Add an enrolled student engineer directly to your official squad using their registered account email.
          </p>

          {msg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                background: msg.type === 'error' ? 'var(--status-eliminated-bg)' : 'var(--status-qualified-bg)',
                border: `1px solid ${msg.type === 'error' ? 'var(--status-eliminated-border)' : 'var(--status-qualified-border)'}`,
                color: msg.type === 'error' ? 'var(--status-eliminated)' : 'var(--status-qualified)',
              }}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.75rem', maxWidth: '520px' }}>
            <input
              type="email"
              className="form-input"
              required
              placeholder="competitor@college.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="primary" isLoading={inviting}>
              Induct Member
            </Button>
          </form>
        </div>
      )}

      {/* Members Table */}
      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Competitor Name</th>
              <th>Official Role</th>
              <th>College</th>
              <th>Department</th>
              <th>Status</th>
              <th>Induction Date</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{member.profiles?.full_name || 'Anonymous Competitor'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.profiles?.email}</div>
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
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                  {new Date(member.joined_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
