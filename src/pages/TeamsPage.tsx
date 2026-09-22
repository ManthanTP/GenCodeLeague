import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Team, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: edData } = await supabase.from('editions').select('*').order('year', { ascending: false });
      if (edData) setEditions(edData as Edition[]);

      let query = supabase.from('teams').select('*').order('name', { ascending: true });
      const { data: teamData } = await query;
      if (teamData) setTeams(teamData as Team[]);

      setLoading(false);
    }
    loadData();
  }, []);

  const filteredTeams = teams.filter((t) => {
    if (selectedEdition !== 'all' && t.edition_id !== selectedEdition) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>League Teams</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Official rosters, qualification standings, and team representations across Gen Code League tournament seasons.
        </p>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'var(--bg-surface)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>EDITION:</label>
          <select
            className="form-select"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
          >
            <option value="all">All Seasons</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS:</label>
          <select
            className="form-select"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="qualified">Qualified</option>
            <option value="finalist">Finalist</option>
            <option value="winner">Winner</option>
            <option value="eliminated">Eliminated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading team rosters..." />
      ) : filteredTeams.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredTeams.map((team) => (
            <Link key={team.id} to={`/teams/${team.id}`} style={{ textDecoration: 'none' }}>
              <div className="gcl-card interactive" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--gold)',
                      }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
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
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {team.name}
                  </h3>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>View Roster</span>
                  <span style={{ color: 'var(--gold)' }}>&rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Teams Found"
          description="No competitive teams match the current filter selection."
        />
      )}
    </div>
  );
}
