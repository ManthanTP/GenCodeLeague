import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Round, Submission } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminQuizControlPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, []);

  async function loadRounds() {
    setLoading(true);
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('type', 'quiz')
      .order('sort_order', { ascending: true });

    if (data && data.length > 0) {
      setRounds(data as Round[]);
      setSelectedRound(data[0] as Round);
      loadSubmissions(data[0].id);
    }
    setLoading(false);
  }

  async function loadSubmissions(roundId: string) {
    const { data } = await supabase
      .from('submissions')
      .select('*, team:teams(*), question:questions(*)')
      .eq('round_id', roundId)
      .order('submitted_at', { ascending: false });

    if (data) setSubmissions(data as unknown as Submission[]);
  }

  async function handleToggleStatus(status: 'live' | 'locked' | 'completed') {
    if (!selectedRound) return;
    await supabase.from('rounds').update({ status }).eq('id', selectedRound.id);
    const updated = { ...selectedRound, status };
    setSelectedRound(updated);
    setRounds((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading quiz control module..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Quiz Adjudication Desk</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Start rounds, monitor incoming team submission streams, and lock evaluation timers.
          </p>
        </div>

        {selectedRound && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => handleToggleStatus('live')}>
              Unlock & Go Live
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleToggleStatus('locked')}>
              Lock Round Instantly
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleToggleStatus('completed')}>
              Conclude Round
            </Button>
          </div>
        )}
      </div>

      {selectedRound ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Stage</div>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{selectedRound.name}</h3>
              <div style={{ marginTop: '0.5rem' }}>
                <Badge variant={selectedRound.status === 'live' ? 'live' : 'subtle'} pulse={selectedRound.status === 'live'}>
                  {selectedRound.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logged Submissions</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.25rem' }}>
                {submissions.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team Submissions</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time Limit</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {selectedRound.duration_minutes || 30}m
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated client submission</div>
            </div>
          </div>

          {/* Submissions Feed */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
              Incoming Team Submissions ({submissions.length})
            </h3>
            {submissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No team submissions recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {sub.team?.name || 'Competing Team'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Answer: <strong style={{ color: 'var(--text-primary)' }}>{sub.answer}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(sub.submitted_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No quiz rounds configured for this edition.</p>
        </div>
      )}
    </div>
  );
}
