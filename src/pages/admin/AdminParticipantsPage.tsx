import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, UserRole, TeamMember, Team } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface MemberWithTeam extends TeamMember {
  team?: Team;
}

export function AdminParticipantsPage() {
  const [tab, setTab] = useState<'members' | 'accounts'>('members');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<MemberWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [profilesRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*, team:teams(*)').order('created_at', { ascending: false }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (membersRes.data) setMembers(membersRes.data as MemberWithTeam[]);
    setLoading(false);
  }

  async function handleRoleChange(profileId: string, newRole: UserRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    await loadData();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Competitor Directory & Roles</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Review registered squad members, assign team leader credentials, and manage system administrators.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: tab === 'members' ? 'var(--gold)' : 'transparent',
              color: tab === 'members' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
            onClick={() => setTab('members')}
          >
            Squad Members ({members.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: tab === 'accounts' ? 'var(--gold)' : 'transparent',
              color: tab === 'accounts' ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
            onClick={() => setTab('accounts')}
          >
            User Accounts ({profiles.length})
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading registry..." />
      ) : tab === 'members' ? (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th>Squad / Team</th>
                <th>USN / ID</th>
                <th>College / Department</th>
                <th>Semester</th>
                <th>Designation</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No team members enrolled yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name || 'Member'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email || m.phone || '—'}</div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--gold)' }}>{m.team?.name || 'Assigned Squad'}</strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{m.usn || '—'}</span>
                    </td>
                    <td>
                      <div>{m.college || m.team?.college || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.department || m.team?.department || '—'}</div>
                    </td>
                    <td>{m.semester ? `Sem ${m.semester}` : '—'}</td>
                    <td>
                      <Badge variant={m.is_leader ? 'gold' : 'subtle'}>
                        {m.is_leader ? '★ TEAM LEADER' : (m.role || 'MEMBER').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Account Holder</th>
                <th>Email</th>
                <th>Role Designation</th>
                <th>Role Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.full_name || 'User Account'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      ID: {p.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                  <td>
                    <Badge variant={p.role === 'admin' || p.role === 'super_admin' ? 'gold' : p.role === 'team_leader' ? 'live' : 'subtle'}>
                      {p.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {p.role !== 'team_leader' && (
                        <Button variant="outline" size="sm" onClick={() => handleRoleChange(p.id, 'team_leader')}>
                          Set Team Leader
                        </Button>
                      )}
                      {p.role !== 'admin' && p.role !== 'super_admin' && (
                        <Button variant="secondary" size="sm" onClick={() => handleRoleChange(p.id, 'admin')}>
                          Make Admin
                        </Button>
                      )}
                      {p.role !== 'participant' && (
                        <Button variant="outline" size="sm" onClick={() => handleRoleChange(p.id, 'participant')}>
                          Demote
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
