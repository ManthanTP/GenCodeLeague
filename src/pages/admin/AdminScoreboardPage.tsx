import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Team, ScoreEntry, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminScoreboardPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Score Adjustment Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [pointsDelta, setPointsDelta] = useState<number>(10);
  const [scoreSource, setScoreSource] = useState<ScoreEntry['source']>('manual_adjustment');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    loadScoreboardData();

    // Listen to teams & scores changes
    const channel = supabase
      .channel('admin-scoreboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadScoreboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        loadScoreboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadScoreboardData() {
    try {
      const { data: edition } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();

      if (edition) {
        setCurrentEdition(edition as Edition);

        // Load teams ordered by score descending
        const { data: teamData } = await supabase
          .from('teams')
          .select('*, captain:profiles!teams_captain_id_fkey(*)')
          .eq('edition_id', edition.id)
          .order('score', { ascending: false });

        if (teamData) setTeams(teamData as Team[]);

        // Load recent score entries
        const { data: scoreData } = await supabase
          .from('scores')
          .select('*, team:teams(*)')
          .eq('edition_id', edition.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (scoreData) setRecentScores(scoreData as ScoreEntry[]);
      }
    } catch (err: any) {
      console.error('Failed to load scoreboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustScore(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId || !currentEdition) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert into traceable scores table
      const { error: scoreErr } = await supabase.from('scores').insert({
        edition_id: currentEdition.id,
        team_id: selectedTeamId,
        points: pointsDelta,
        source: scoreSource,
        reason: reason.trim() || 'Official administrative score adjustment',
        created_by: user?.id || null,
      });

      if (scoreErr) throw scoreErr;

      // 2. Fetch current team score and update
      const targetTeam = teams.find((t) => t.id === selectedTeamId);
      const newScore = (targetTeam?.score || 0) + Number(pointsDelta);

      const { error: teamErr } = await supabase
        .from('teams')
        .update({
          score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTeamId);

      if (teamErr) throw teamErr;

      // Close modal and refresh
      setModalOpen(false);
      setReason('');
      await loadScoreboardData();
    } catch (err: any) {
      alert(`Score adjustment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecomputeRanks() {
    if (!teams.length) return;
    setActionLoading(true);
    try {
      // Sort teams by score desc
      const sorted = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));

      for (let i = 0; i < sorted.length; i++) {
        const rank = i + 1;
        await supabase
          .from('teams')
          .update({ rank })
          .eq('id', sorted[i].id);
      }

      await loadScoreboardData();
      alert('Team ranks recalculated and synchronized successfully.');
    } catch (err: any) {
      alert(`Failed to recalculate ranks: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Loading Official Scoreboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Official League Scoreboard
            </h1>
            <Badge variant="primary">
              {currentEdition ? `${currentEdition.name}` : 'GCL LEAGUE'}
            </Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Permanent traceable ledger for points, penalties, bonuses, and real-time standings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" size="sm" onClick={handleRecomputeRanks} disabled={actionLoading}>
            🔢 Recompute Ranks
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (teams.length > 0) setSelectedTeamId(teams[0].id);
              setModalOpen(true);
            }}
          >
            ➕ Award / Deduct Points
          </Button>
        </div>
      </div>

      {/* Standings Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Live Team Standings
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Total Teams: <strong>{teams.length}</strong>
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '60px' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Team Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Institution</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Official Score</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Remaining Budget</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No registered teams found for this edition.
                  </td>
                </tr>
              ) : (
                teams.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background:
                            idx === 0
                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                              : idx === 1
                              ? '#94a3b8'
                              : idx === 2
                              ? '#b45309'
                              : 'var(--bg-elevated)',
                          color: idx < 3 ? '#000' : 'var(--text-secondary)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {t.rank || idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {t.college || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--gold)' }}>
                      {t.score} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 700 }}>
                      {t.remaining_budget} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cr</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge variant={t.status === 'qualified' ? 'live' : 'subtle'}>
                        {t.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTeamId(t.id);
                          setModalOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traceable Scoring Ledger History */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          📜 Traceable Score Ledger (Recent Events)
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Every point awarded or deducted is indelibly logged with its official source and reason.
        </p>

        {recentScores.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No score transactions recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {recentScores.map((score) => (
              <div
                key={score.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{score.team?.name || 'Team'}</strong>
                    <Badge variant="subtle">{score.source.toUpperCase()}</Badge>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {score.reason || 'Official score update'} &bull; {new Date(score.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                    color: Number(score.points) >= 0 ? '#34d399' : '#ef4444',
                  }}
                >
                  {Number(score.points) >= 0 ? `+${score.points}` : score.points} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award / Deduct Points Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Award or Deduct Score Points">
        <form onSubmit={handleAdjustScore} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Recipient Team</label>
            <select
              className="form-input"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              required
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Current: {t.score} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Points Adjustment (+ or -)</label>
            <input
              type="number"
              className="form-input"
              value={pointsDelta}
              onChange={(e) => setPointsDelta(Number(e.target.value))}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Enter positive values to add points, negative values to deduct penalty points.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Score Source</label>
            <select
              className="form-input"
              value={scoreSource}
              onChange={(e) => setScoreSource(e.target.value as ScoreEntry['source'])}
            >
              <option value="quiz">Quiz Round Answer</option>
              <option value="auction">Auction Round Result</option>
              <option value="bonus">Bonus Points</option>
              <option value="penalty">Penalty Deduction</option>
              <option value="tie_breaker">Tie Breaker Resolution</option>
              <option value="manual_adjustment">Manual Admin Adjustment</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Official Reason / Description</label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Correct technical execution on Round 2 Question 4"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={actionLoading}>
              Commit Score Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
