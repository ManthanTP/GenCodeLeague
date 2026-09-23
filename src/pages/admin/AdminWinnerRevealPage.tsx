import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Team, WinnerReveal, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminWinnerRevealPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reveals, setReveals] = useState<WinnerReveal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Setup form states for positions 1, 2, 3
  const [teamPos1, setTeamPos1] = useState('');
  const [teamPos2, setTeamPos2] = useState('');
  const [teamPos3, setTeamPos3] = useState('');

  useEffect(() => {
    loadRevealData();

    const channel = supabase
      .channel('admin-winner-reveals-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'winner_reveals' }, () => {
        loadRevealData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadRevealData() {
    try {
      const { data: edition } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();

      if (edition) {
        setCurrentEdition(edition as Edition);

        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', edition.id)
          .order('score', { ascending: false });

        if (teamData) {
          setTeams(teamData as Team[]);
          // Pre-populate with top 3 teams if not yet set
          if (teamData.length >= 3) {
            setTeamPos1(teamData[0].id);
            setTeamPos2(teamData[1].id);
            setTeamPos3(teamData[2].id);
          }
        }

        const { data: revData } = await supabase
          .from('winner_reveals')
          .select('*, team:teams(*)')
          .eq('edition_id', edition.id)
          .order('position', { ascending: true });

        if (revData) {
          setReveals(revData as WinnerReveal[]);
          const p1 = revData.find((r) => r.position === 1);
          const p2 = revData.find((r) => r.position === 2);
          const p3 = revData.find((r) => r.position === 3);
          if (p1) setTeamPos1(p1.team_id);
          if (p2) setTeamPos2(p2.team_id);
          if (p3) setTeamPos3(p3.team_id);
        }
      }
    } catch (err: any) {
      console.error('Error loading reveal data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePodium() {
    if (!currentEdition) return;
    setActionLoading(true);
    try {
      // Upsert position 1, 2, 3
      const payload = [
        { edition_id: currentEdition.id, position: 1, team_id: teamPos1, is_revealed: false },
        { edition_id: currentEdition.id, position: 2, team_id: teamPos2, is_revealed: false },
        { edition_id: currentEdition.id, position: 3, team_id: teamPos3, is_revealed: false },
      ].filter((p) => !!p.team_id);

      for (const item of payload) {
        await supabase
          .from('winner_reveals')
          .upsert(item, { onConflict: 'edition_id, position' });
      }

      await loadRevealData();
      alert('Podium configuration saved securely. Results are currently HIDDEN.');
    } catch (err: any) {
      alert(`Error saving podium: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleReveal(position: number, currentRevealed: boolean) {
    if (!currentEdition) return;
    setActionLoading(true);
    try {
      const nextRevealed = !currentRevealed;
      const { error } = await supabase
        .from('winner_reveals')
        .update({
          is_revealed: nextRevealed,
          revealed_at: nextRevealed ? new Date().toISOString() : null,
        })
        .eq('edition_id', currentEdition.id)
        .eq('position', position);

      if (error) throw error;

      // Ensure event state is set to FINAL_REVEAL so projector switches
      await supabase
        .from('event_state')
        .update({
          state: 'FINAL_REVEAL',
          banner_message: `Ceremony: Announcing Position #${position}!`,
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      await loadRevealData();
    } catch (err: any) {
      alert(`Reveal toggle failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetAllReveals() {
    if (!currentEdition || !confirm('Reset all podium reveals back to HIDDEN state?')) return;
    setActionLoading(true);
    try {
      await supabase
        .from('winner_reveals')
        .update({ is_revealed: false, revealed_at: null })
        .eq('edition_id', currentEdition.id);

      await loadRevealData();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Loading Podium Ceremony Controls..." />
      </div>
    );
  }

  const p1Reveal = reveals.find((r) => r.position === 1);
  const p2Reveal = reveals.find((r) => r.position === 2);
  const p3Reveal = reveals.find((r) => r.position === 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Podium & Winner Reveal Control
            </h1>
            <Badge variant="gold">CEREMONY MODE</Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            PRD Secrecy Protocol: Results remain completely concealed from public screens until individually unlocked by Admin.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={handleResetAllReveals} disabled={actionLoading}>
          🔒 Reset All to Concealed
        </Button>
      </div>

      {/* Podium Stage Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* 3rd Place */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            textAlign: 'center',
            border: p3Reveal?.is_revealed ? '1px solid #b45309' : '1px solid var(--border-subtle)',
            background: p3Reveal?.is_revealed ? 'rgba(180, 83, 9, 0.08)' : 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥉</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            2nd Runner Up
          </div>
          <h2 style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', margin: '0.5rem 0' }}>
            Position #3
          </h2>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Designated Team</label>
            <select
              className="form-input"
              value={teamPos3}
              onChange={(e) => setTeamPos3(e.target.value)}
              disabled={p3Reveal?.is_revealed}
            >
              <option value="">-- Choose Team --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.score} pts)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Button
              variant={p3Reveal?.is_revealed ? 'secondary' : 'gold'}
              size="md"
              onClick={() => handleToggleReveal(3, !!p3Reveal?.is_revealed)}
              isLoading={actionLoading}
              style={{ width: '100%' }}
            >
              {p3Reveal?.is_revealed ? '🔒 Hide 3rd Place' : '🎉 REVEAL 3RD PLACE'}
            </Button>
          </div>
        </div>

        {/* 2nd Place */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            textAlign: 'center',
            border: p2Reveal?.is_revealed ? '1px solid #94a3b8' : '1px solid var(--border-subtle)',
            background: p2Reveal?.is_revealed ? 'rgba(148, 163, 184, 0.08)' : 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥈</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            1st Runner Up
          </div>
          <h2 style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', margin: '0.5rem 0' }}>
            Position #2
          </h2>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Designated Team</label>
            <select
              className="form-input"
              value={teamPos2}
              onChange={(e) => setTeamPos2(e.target.value)}
              disabled={p2Reveal?.is_revealed}
            >
              <option value="">-- Choose Team --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.score} pts)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Button
              variant={p2Reveal?.is_revealed ? 'secondary' : 'gold'}
              size="md"
              onClick={() => handleToggleReveal(2, !!p2Reveal?.is_revealed)}
              isLoading={actionLoading}
              style={{ width: '100%' }}
            >
              {p2Reveal?.is_revealed ? '🔒 Hide 2nd Place' : '🎉 REVEAL 2ND PLACE'}
            </Button>
          </div>
        </div>

        {/* 1st Place - CHAMPION */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            textAlign: 'center',
            border: '2px solid var(--border-gold)',
            background: p1Reveal?.is_revealed
              ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 17, 24, 0.95) 100%)'
              : 'var(--bg-surface)',
            boxShadow: 'var(--shadow-gold)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👑</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase' }}>
            GCL CHAMPION
          </div>
          <h2 style={{ fontSize: '1.625rem', fontFamily: 'var(--font-display)', margin: '0.5rem 0' }}>
            Champion #1
          </h2>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Designated Champion</label>
            <select
              className="form-input"
              value={teamPos1}
              onChange={(e) => setTeamPos1(e.target.value)}
              disabled={p1Reveal?.is_revealed}
            >
              <option value="">-- Choose Champion --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.score} pts)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Button
              variant={p1Reveal?.is_revealed ? 'secondary' : 'gold'}
              size="lg"
              onClick={() => handleToggleReveal(1, !!p1Reveal?.is_revealed)}
              isLoading={actionLoading}
              style={{ width: '100%', fontWeight: 800 }}
            >
              {p1Reveal?.is_revealed ? '🔒 Conceal Champion' : '🏆 REVEAL CHAMPION!'}
            </Button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Button variant="secondary" size="md" onClick={handleSavePodium} isLoading={actionLoading}>
          💾 Save & Lock Podium Team Allocations
        </Button>
      </div>
    </div>
  );
}
