import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminParticipantsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParticipants();
  }, []);

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }

  async function handleRoleChange(profileId: string, newRole: UserRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    await loadParticipants();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Competitor Directory & Roles</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review registered engineers, assign captain credentials, and verify collegiate affiliations.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading competitor registry..." />
      ) : (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Competitor Name</th>
                <th>Academic Email</th>
                <th>College / Institution</th>
                <th>Role Designation</th>
                <th>Role Promotion</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.full_name || 'Anonymous Competitor'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      USN: {p.usn || 'N/A'}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                  <td>
                    <div>{p.college || 'Institution Configured'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.department || 'Engineering'}</div>
                  </td>
                  <td>
                    <Badge variant={p.role === 'admin' ? 'gold' : p.role === 'captain' ? 'live' : 'subtle'}>
                      {p.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {p.role !== 'captain' && (
                        <Button variant="outline" size="sm" onClick={() => handleRoleChange(p.id, 'captain')}>
                          Make Captain
                        </Button>
                      )}
                      {p.role !== 'admin' && (
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
