import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { LeaderboardEntry, Team, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface EntryWithTeam extends LeaderboardEntry {
  teams?: Team;
}

export function AdminLeaderboardPage() {
  const [entries, setEntries] = useState<EntryWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  // New Score state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [points, setPoints] = useState(100);
  const [rank, setRank] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);

      const [entryRes, teamRes] = await Promise.all([
        supabase.from('leaderboard_entries').select('*, teams:team_id (*)').eq('edition_id', edData.id).order('rank', { ascending: true }),
        supabase.from('teams').select('*').eq('edition_id', edData.id),
      ]);

      if (entryRes.data) setEntries(entryRes.data as EntryWithTeam[]);
      if (teamRes.data && teamRes.data.length > 0) {
        setTeams(teamRes.data as Team[]);
        setSelectedTeamId(teamRes.data[0].id);
      }
    }
    setLoading(false);
  }

  async function handleAddOrUpdateEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !selectedTeamId) return;

    await supabase.from('leaderboard_entries').upsert({
      edition_id: currentEdition.id,
      team_id: selectedTeamId,
      points,
      rank,
      status: 'live',
      updated_at: new Date().toISOString(),
    });

    await loadData();
  }

  async function handleSetAllStatus(status: 'hidden' | 'live' | 'published' | 'final') {
    if (!currentEdition) return;
    await supabase
      .from('leaderboard_entries')
      .update({ status })
      .eq('edition_id', currentEdition.id);

    await loadData();
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading leaderboard adjudication console..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Leaderboard Adjudication</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Publish standings, adjust verified points, or toggle hidden adjudication mode.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" size="sm" onClick={() => handleSetAllStatus('hidden')}>
            Hide All (Adjudication Mode)
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleSetAllStatus('live')}>
            Stream Live
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleSetAllStatus('final')}>
            Publish Final Standings
          </Button>
        </div>
      </div>

      {/* Add / Adjust Score Card */}
      <div className="gcl-card">
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Score Adjudication & Rank Override</h3>
        <form onSubmit={handleAddOrUpdateEntry} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Squad</label>
            <select className="form-select" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rank (#)</label>
            <input
              type="number"
              className="form-input"
              required
              value={rank}
              onChange={(e) => setRank(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Points</label>
            <input
              type="number"
              className="form-input"
              required
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value, 10))}
            />
          </div>

          <Button type="submit" variant="primary">
            Record Score
          </Button>
        </form>
      </div>

      {/* Standings Table */}
      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Squad</th>
              <th>Score Points</th>
              <th>Broadcast Visibility</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                  #{entry.rank}
                </td>
                <td style={{ fontWeight: 600 }}>{entry.teams?.name || 'Squad'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem' }}>
                  {entry.points} pts
                </td>
                <td>
                  <Badge variant={entry.status === 'live' ? 'live' : entry.status === 'hidden' ? 'eliminated' : 'gold'}>
                    {entry.status.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                  {new Date(entry.updated_at).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
