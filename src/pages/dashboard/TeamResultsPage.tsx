import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { ScoreEntry, Submission } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function TeamResultsPage() {
  const { team } = useAuth();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      if (!team?.id) {
        setLoading(false);
        return;
      }
      try {
        const [scoreRes, subRes] = await Promise.all([
          supabase
            .from('scores')
            .select('*, round:rounds(*)')
            .eq('team_id', team.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('submissions')
            .select('*, question:questions(*)')
            .eq('team_id', team.id)
            .order('submitted_at', { ascending: false }),
        ]);

        if (scoreRes.data) setScores(scoreRes.data as ScoreEntry[]);
        if (subRes.data) setSubmissions(subRes.data as unknown as Submission[]);
      } catch (err) {
        console.error('Failed to load team results:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [team?.id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading Team Scoring Breakdown..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Team Performance & Scoring Ledger
          </h1>
          <Badge variant="primary">Total: {team?.score ?? 0} Points</Badge>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Detailed record of every round submission, verified challenge, bonus, and penalty transaction.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Official Score Ledger */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>
            📜 Official Points Ledger ({scores.length} Events)
          </h2>

          {scores.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No score transactions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {scores.map((s) => (
                <div
                  key={s.id}
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
                      <strong style={{ fontSize: '0.875rem' }}>{s.reason || 'Point Transaction'}</strong>
                      <Badge variant="subtle">{s.source.toUpperCase()}</Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(s.created_at).toLocaleDateString()} at {new Date(s.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '1.125rem',
                      color: Number(s.points) >= 0 ? '#34d399' : '#ef4444',
                    }}
                  >
                    {Number(s.points) >= 0 ? `+${s.points}` : s.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Round Answer Submissions */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>
            🎯 Submitted Question Answers ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No answers submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      Q: {sub.question?.question_text ? sub.question.question_text.substring(0, 50) + '...' : 'Question'}
                    </div>
                    {sub.is_correct !== null && (
                      <Badge variant={sub.is_correct ? 'live' : 'danger'}>
                        {sub.is_correct ? 'CORRECT' : 'INCORRECT'}
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Your Team Answer: <strong style={{ color: 'var(--text-primary)' }}>{sub.answer}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Submitted at: {new Date(sub.submitted_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
