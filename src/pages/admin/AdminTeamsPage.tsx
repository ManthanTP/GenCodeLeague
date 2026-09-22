import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Team, TeamStatus, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: edData } = await supabase.from('editions').select('*').order('year', { ascending: false });
      if (edData && edData.length > 0) {
        setEditions(edData as Edition[]);
        const cur = edData.find((e) => e.is_current) || edData[0];
        setSelectedEdition(cur.id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedEdition) return;
    loadTeams();
  }, [selectedEdition]);

  async function loadTeams() {
    setLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('edition_id', selectedEdition)
      .order('name', { ascending: true });

    if (data) setTeams(data as Team[]);
    setLoading(false);
  }

  async function handleUpdateStatus(teamId: string, newStatus: TeamStatus) {
    await supabase.from('teams').update({ status: newStatus }).eq('id', teamId);
    await loadTeams();
  }

  if (loading && teams.length === 0) {
    return <LoadingSpinner size="lg" text="Loading squads..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Team & Squad Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Approve registrations, designate qualification stages, or eliminate squads.
          </p>
        </div>

        <select
          className="form-select"
          value={selectedEdition}
          onChange={(e) => setSelectedEdition(e.target.value)}
        >
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.name} ({ed.year})
            </option>
          ))}
        </select>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Squad Name</th>
              <th>Current Status</th>
              <th>Registration Date</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>
                  <Badge
                    variant={
                      t.status === 'qualified'
                        ? 'qualified'
                        : t.status === 'winner'
                        ? 'gold'
                        : t.status === 'eliminated'
                        ? 'eliminated'
                        : 'subtle'
                    }
                  >
                    {t.status.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(t.id, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(t.id, 'qualified')}>
                      Qualify
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleUpdateStatus(t.id, 'eliminated')}>
                      Eliminate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
