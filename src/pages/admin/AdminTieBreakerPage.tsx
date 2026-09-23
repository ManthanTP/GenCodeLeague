import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Team, TieBreaker, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminTieBreakerPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tieBreakers, setTieBreakers] = useState<TieBreaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New Tie Breaker Form
  const [selectedTiedTeamIds, setSelectedTiedTeamIds] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTieBreakers();
  }, []);

  async function loadTieBreakers() {
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

        if (teamData) setTeams(teamData as Team[]);

        const { data: tbData } = await supabase
          .from('tie_breakers')
          .select('*, winner_team:teams!tie_breakers_winner_team_id_fkey(*)')
          .eq('edition_id', edition.id)
          .order('created_at', { ascending: false });

        if (tbData) setTieBreakers(tbData as unknown as TieBreaker[]);
      }
    } catch (err: any) {
      console.error('Error loading tie breakers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTieBreaker(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || selectedTiedTeamIds.length < 2) {
      alert('Please select at least 2 teams involved in the tie.');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('tie_breakers').insert({
        edition_id: currentEdition.id,
        tied_team_ids: selectedTiedTeamIds,
        question_text: questionText.trim() || 'Sudden death technical challenge',
        status: 'active',
        notes: notes.trim() || null,
      });

      if (error) throw error;

      // Update event state to TIE_BREAKER
      await supabase
        .from('event_state')
        .update({
          state: 'TIE_BREAKER',
          banner_message: 'Sudden Death Tie Breaker in Progress!',
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      setSelectedTiedTeamIds([]);
      setQuestionText('');
      setNotes('');
      await loadTieBreakers();
      alert('Tie breaker initialized and live broadcast activated!');
    } catch (err: any) {
      alert(`Failed to create tie breaker: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolveTieBreaker(tieBreakerId: string, winnerId: string) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tie_breakers')
        .update({
          winner_team_id: winnerId,
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tieBreakerId);

      if (error) throw error;

      // Award bonus tie-breaker point to winner
      if (currentEdition) {
        await supabase.from('scores').insert({
          edition_id: currentEdition.id,
          team_id: winnerId,
          points: 1,
          source: 'tie_breaker',
          reason: 'Victorious in Sudden Death Tie Breaker',
        });

        const targetTeam = teams.find((t) => t.id === winnerId);
        if (targetTeam) {
          await supabase
            .from('teams')
            .update({ score: (targetTeam.score || 0) + 1 })
            .eq('id', winnerId);
        }
      }

      await loadTieBreakers();
      alert('Tie breaker resolved! Points updated.');
    } catch (err: any) {
      alert(`Error resolving tie breaker: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  function toggleTeamSelection(id: string) {
    setSelectedTiedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Loading Tie Breaker Controls..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Tie Breaker Management
          </h1>
          <Badge variant="warning">SUDDEN DEATH</Badge>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Resolve identical scores, trigger sudden-death challenges, and record official tie-breaking outcomes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Create Tie Breaker Form */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            ⚔️ Initiate New Tie Breaker
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Select the teams with identical standings and set the sudden-death question.
          </p>

          <form onSubmit={handleCreateTieBreaker} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Select Tied Teams (Min 2)</label>
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                {teams.map((t) => {
                  const selected = selectedTiedTeamIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTeamSelection(t.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: selected ? 'var(--bg-elevated)' : 'transparent',
                        border: selected ? '1px solid var(--border-gold)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: selected ? 600 : 400 }}>
                        {selected ? '☑ ' : '☐ '} {t.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--gold)' }}>
                        {t.score} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sudden Death Challenge Text</label>
              <textarea
                className="form-input"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="State the technical question or live speed challenge..."
                required
              />
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={actionLoading}>
              🚀 Launch Tie Breaker Arena
            </Button>
          </form>
        </div>

        {/* Existing / Active Tie Breakers */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            📋 Recorded Tie Breakers
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Active and resolved sudden-death faceoffs.
          </p>

          {tieBreakers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tie breakers recorded.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tieBreakers.map((tb) => {
                const tiedTeamsList = teams.filter((t) => tb.tied_team_ids?.includes(t.id));
                return (
                  <div
                    key={tb.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <Badge variant={tb.status === 'resolved' ? 'subtle' : 'live'}>
                        {tb.status.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(tb.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {tb.question_text}
                    </p>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <strong>Contenders:</strong> {tiedTeamsList.map((t) => t.name).join(' vs ')}
                    </div>

                    {tb.status === 'active' ? (
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Declare Victor:
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {tiedTeamsList.map((t) => (
                            <Button
                              key={t.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveTieBreaker(tb.id, t.id)}
                              disabled={actionLoading}
                            >
                              🏆 {t.name} Wins
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: '#34d399', fontWeight: 600 }}>
                        🏆 Victor: {tb.winner_team?.name || 'Declared'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
