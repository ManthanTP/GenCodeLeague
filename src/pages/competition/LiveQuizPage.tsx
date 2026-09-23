import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { EventState, Question, Round, Submission } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function LiveQuizPage() {
  const { team } = useAuth();
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Local synchronized timer
  const [localSeconds, setLocalSeconds] = useState<number>(60);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadLiveArenaState();

    // Subscribe to event_state and submissions
    const channel = supabase
      .channel('team-live-arena')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => {
        loadLiveArenaState();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        if (team?.id) loadExistingSubmission();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [team?.id]);

  async function loadLiveArenaState() {
    try {
      // 1. Fetch current event state
      const { data: stateData } = await supabase
        .from('event_state')
        .select('*, current_round:rounds(*), current_question:questions(*)')
        .limit(1)
        .maybeSingle();

      if (stateData) {
        setEventState(stateData as EventState);
        setLocalSeconds(stateData.timer_remaining_seconds || 60);

        if (stateData.current_round) {
          setActiveRound(stateData.current_round as Round);
        }

        if (stateData.current_question) {
          setActiveQuestion(stateData.current_question as Question);
        } else if (stateData.current_round_id) {
          // If no specific question is pinned, load first active question
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('round_id', stateData.current_round_id)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (qData) setActiveQuestion(qData as Question);
        }
      }

      await loadExistingSubmission();
    } catch (err) {
      console.error('Error loading arena state:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingSubmission() {
    if (!team?.id || !activeQuestion?.id) return;
    const { data: subData } = await supabase
      .from('submissions')
      .select('*')
      .eq('team_id', team.id)
      .eq('question_id', activeQuestion.id)
      .maybeSingle();

    if (subData) {
      setExistingSubmission(subData as Submission);
      setSelectedAnswer(subData.answer);
    } else {
      setExistingSubmission(null);
    }
  }

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (eventState?.timer_state === 'running' && localSeconds > 0) {
      timerRef.current = setInterval(() => {
        setLocalSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventState?.timer_state, localSeconds]);

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !activeQuestion || !activeRound || !selectedAnswer.trim()) return;
    if (existingSubmission || localSeconds <= 0) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          edition_id: team.edition_id,
          round_id: activeRound.id,
          question_id: activeQuestion.id,
          team_id: team.id,
          answer: selectedAnswer.trim(),
          time_taken_seconds: (eventState?.timer_duration_seconds || 60) - localSeconds,
        })
        .select()
        .single();

      if (error) throw error;
      setExistingSubmission(data as Submission);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Connecting to Live Arena Stream..." />
      </div>
    );
  }

  // If tournament is not currently live or paused
  if (!eventState || eventState.state === 'NOT_STARTED' || eventState.state === 'INTERMISSION' || eventState.state === 'COMPLETED') {
    return (
      <div className="container" style={{ maxWidth: '680px', margin: '2rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
          <Badge variant="subtle" style={{ marginBottom: '1rem' }}>
            STATUS: {eventState?.state || 'NOT STARTED'}
          </Badge>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
            Live Arena On Standby
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {eventState?.banner_message ||
              'The tournament director will activate the live round shortly. Keep this terminal open; questions and server timers will stream in real-time.'}
          </p>

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            Competing as: <strong style={{ color: 'var(--text-primary)' }}>{team?.name || 'Registered Squad'}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Live Header & Timer Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          padding: '1.5rem 2rem',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 17, 24, 0.95) 100%)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <Badge variant="live" pulse>
              ROUND {activeRound?.round_number || 1} LIVE
            </Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {activeRound?.name || 'Technical Challenge'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {activeQuestion ? `Question #${activeQuestion.question_number || 1}` : 'Active Challenge'}
          </h1>
        </div>

        {/* Server Synchronized Countdown Timer */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Time Remaining
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: localSeconds <= 10 ? '#ef4444' : 'var(--gold)',
              lineHeight: 1,
            }}
          >
            {formatTimer(localSeconds)}
          </div>
        </div>
      </div>

      {/* Broadcast Message if any */}
      {eventState.banner_message && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--gold)',
            fontSize: '0.875rem',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          📢 {eventState.banner_message}
        </div>
      )}

      {/* Question & Answer Submission Box */}
      {activeQuestion ? (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <Badge variant="subtle">{activeQuestion.points} Points Awarded</Badge>
            {existingSubmission && (
              <Badge variant="live">
                ✓ OFFICIAL ANSWER SUBMITTED
              </Badge>
            )}
          </div>

          <h2 style={{ fontSize: '1.25rem', lineHeight: 1.5, fontWeight: 600, marginBottom: '2rem' }}>
            {activeQuestion.question_text}
          </h2>

          <form onSubmit={handleSubmitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Options */}
            {activeQuestion.options && activeQuestion.options.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeQuestion.options.map((opt, idx) => {
                  const optText = typeof opt === 'string' ? opt : opt.text;
                  const isChecked = selectedAnswer === optText;
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                        border: isChecked ? '2px solid var(--border-gold)' : '1px solid var(--border-subtle)',
                        cursor: existingSubmission || localSeconds <= 0 ? 'default' : 'pointer',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="arena-option"
                        value={optText}
                        checked={isChecked}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        disabled={!!existingSubmission || localSeconds <= 0}
                        style={{ accentColor: 'var(--gold)', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.9375rem', fontWeight: isChecked ? 600 : 400 }}>
                        {optText}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Team Solution / Answer</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={!!existingSubmission || localSeconds <= 0}
                  placeholder="Type your official team response here..."
                  required
                />
              </div>
            )}

            {/* Submission Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {existingSubmission
                  ? `Submitted at: ${new Date(existingSubmission.submitted_at).toLocaleTimeString()}`
                  : localSeconds <= 0
                  ? 'Time has expired for this question.'
                  : 'Submit on behalf of your squad.'}
              </div>

              {!existingSubmission && (
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  isLoading={submitting}
                  disabled={!selectedAnswer || localSeconds <= 0}
                >
                  🚀 Submit Official Team Answer
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Waiting for the active question broadcast from Admin...</p>
        </div>
      )}
    </div>
  );
}
