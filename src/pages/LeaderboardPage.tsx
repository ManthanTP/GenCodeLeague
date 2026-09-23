import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry, Team, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface LeaderboardItem extends LeaderboardEntry {
  teams?: Team;
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardItem[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (edData) {
        setEdition(edData as Edition);

        const { data: lbData } = await supabase
          .from('leaderboard_entries')
          .select(`
            *,
            teams:team_id (*)
          `)
          .eq('edition_id', edData.id)
          .in('status', ['live', 'published', 'final'])
          .order('rank', { ascending: true });

        if (lbData && lbData.length > 0) {
          setEntries(lbData as LeaderboardItem[]);
        } else {
          // Fallback to teams table directly with score/rank
          const { data: teamData } = await supabase
            .from('teams')
            .select('*')
            .eq('edition_id', edData.id)
            .order('score', { ascending: false });

          if (teamData && teamData.length > 0) {
            const simulatedEntries: LeaderboardItem[] = teamData.map((t, idx) => ({
              id: t.id,
              edition_id: t.edition_id,
              round_id: null,
              team_id: t.id,
              rank: t.rank || idx + 1,
              points: Number(t.score) || 0,
              status: 'live',
              updated_at: t.updated_at || new Date().toISOString(),
              teams: t as Team,
            }));
            setEntries(simulatedEntries);
          }
        }
      }
      setLoading(false);
    }
    loadLeaderboard();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Badge variant="live" pulse>LIVE LEAGUE STANDINGS</Badge>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{edition?.name || 'GCL 2026'}</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Championship Leaderboard</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
            Official tournament rankings based on algorithmic challenge scores, quiz accuracy, and round performance.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Fetching verified scores..." />
      ) : entries.length > 0 ? (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Total Points</th>
                <th>Status</th>
                <th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const rankNum = entry.rank ?? 99;
                const isPodium = rankNum <= 3;
                return (
                  <tr key={entry.id} style={{ background: isPodium ? 'rgba(245, 158, 11, 0.03)' : undefined }}>
                    <td>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '1.125rem',
                          color: rankNum === 1 ? 'var(--gold)' : rankNum === 2 ? '#cbd5e1' : rankNum === 3 ? '#b45309' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        {rankNum === 1 ? '🥇 ' : rankNum === 2 ? '🥈 ' : rankNum === 3 ? '🥉 ' : ''}
                        #{rankNum.toString().padStart(2, '0')}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {entry.teams?.name || 'Team Roster'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: 'var(--gold)',
                        }}
                      >
                        {entry.points}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>pts</span>
                    </td>
                    <td>
                      <Badge
                        variant={
                          entry.teams?.status === 'qualified'
                            ? 'qualified'
                            : entry.teams?.status === 'winner'
                            ? 'gold'
                            : entry.teams?.status === 'eliminated'
                            ? 'eliminated'
                            : 'subtle'
                        }
                      >
                        {entry.teams?.status ? entry.teams.status.toUpperCase() : 'ACTIVE'}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                      {new Date(entry.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            ⚡
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Leaderboard Awaiting Round Verification</h3>
          <p style={{ maxWidth: '500px', margin: '0 auto', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Round scores are actively being compiled by the tournament adjudication engine. Official verified standings will stream live once adjudication concludes.
          </p>
        </div>
      )}
    </div>
  );
}
