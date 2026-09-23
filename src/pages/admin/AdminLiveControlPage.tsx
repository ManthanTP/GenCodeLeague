import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { EventState, Round, Question, EventLiveState, TimerState } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminLiveControlPage() {
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [bannerInput, setBannerInput] = useState<string>('');
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Local timer ticker for live UI display
  const [localTimer, setLocalTimer] = useState<number>(60);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadData();

    // Subscribe to event_state changes
    const channel = supabase
      .channel('admin-live-event-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_state' },
        (payload) => {
          if (payload.new) {
            const newState = payload.new as EventState;
            setEventState(newState);
            setLocalTimer(newState.timer_remaining_seconds);
            if (newState.current_round_id) setSelectedRoundId(newState.current_round_id);
            if (newState.current_question_id) setSelectedQuestionId(newState.current_question_id);
            if (newState.banner_message) setBannerInput(newState.banner_message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync local countdown with eventState timer_state
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (eventState?.timer_state === 'running' && localTimer > 0) {
      timerRef.current = setInterval(() => {
        setLocalTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Handle timer expiration
            updateTimerState('expired', 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventState?.timer_state, localTimer]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load active edition & event_state
      const { data: edition } = await supabase
        .from('editions')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      const editionId = edition?.id;
      if (editionId) {
        const { data: stateData } = await supabase
          .from('event_state')
          .select('*, current_round:rounds(*), current_question:questions(*)')
          .eq('edition_id', editionId)
          .maybeSingle();

        if (stateData) {
          setEventState(stateData as EventState);
          setLocalTimer(stateData.timer_remaining_seconds || 60);
          if (stateData.current_round_id) setSelectedRoundId(stateData.current_round_id);
          if (stateData.current_question_id) setSelectedQuestionId(stateData.current_question_id);
          if (stateData.banner_message) setBannerInput(stateData.banner_message);
        }

        // 2. Load rounds for this edition
        const { data: roundsData } = await supabase
          .from('rounds')
          .select('*')
          .eq('edition_id', editionId)
          .order('sort_order', { ascending: true });

        if (roundsData) setRounds(roundsData as Round[]);
      }
    } catch (err: any) {
      console.error('Failed to load event state:', err);
    } finally {
      setLoading(false);
    }
  }

  // When selected round changes, load its questions
  useEffect(() => {
    async function loadRoundQuestions() {
      if (!selectedRoundId) {
        setQuestions([]);
        return;
      }
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('round_id', selectedRoundId)
        .order('sort_order', { ascending: true });

      if (qData) setQuestions(qData as Question[]);
    }
    loadRoundQuestions();
  }, [selectedRoundId]);

  async function updateEventState(stateUpdate: Partial<EventState>) {
    if (!eventState) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('event_state')
        .update({
          ...stateUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventState.id);

      if (error) throw error;
      setStatusMessage('Event state synchronized successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function setOverallState(newState: EventLiveState) {
    await updateEventState({ state: newState });
  }

  async function broadcastRoundAndQuestion() {
    if (!selectedRoundId) {
      alert('Please select a round to activate.');
      return;
    }
    await updateEventState({
      current_round_id: selectedRoundId,
      current_question_id: selectedQuestionId || null,
      state: 'LIVE',
    });

    // Also update round status to 'live'
    await supabase
      .from('rounds')
      .update({ status: 'live' })
      .eq('id', selectedRoundId);
  }

  async function updateTimerState(newState: TimerState, remaining?: number) {
    if (!eventState) return;
    const updatePayload: Partial<EventState> = {
      timer_state: newState,
      timer_remaining_seconds: remaining !== undefined ? remaining : localTimer,
    };

    if (newState === 'running') {
      updatePayload.timer_started_at = new Date().toISOString();
    } else if (newState === 'paused') {
      updatePayload.timer_paused_at = new Date().toISOString();
    }

    setLocalTimer(updatePayload.timer_remaining_seconds!);
    await updateEventState(updatePayload);
  }

  async function resetTimer(seconds: number) {
    if (!eventState) return;
    setLocalTimer(seconds);
    await updateEventState({
      timer_state: 'stopped',
      timer_duration_seconds: seconds,
      timer_remaining_seconds: seconds,
      timer_started_at: null,
      timer_paused_at: null,
    });
  }

  async function broadcastBanner() {
    await updateEventState({ banner_message: bannerInput.trim() || null });
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Loading Live Tournament Control..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Master Live Tournament Control
            </h1>
            <Badge
              variant={
                eventState?.state === 'LIVE'
                  ? 'live'
                  : eventState?.state === 'PAUSED'
                  ? 'warning'
                  : 'subtle'
              }
              pulse={eventState?.state === 'LIVE'}
            >
              STATE: {eventState?.state || 'NOT_STARTED'}
            </Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Direct real-time control over projector screen, Team Leader arena, question broadcast, and server timer.
          </p>
        </div>

        {statusMessage && (
          <div style={{ color: '#34d399', fontSize: '0.875rem', fontWeight: 600 }}>
            ✓ {statusMessage}
          </div>
        )}
      </div>

      {/* Grid of Command Modules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Module 1: Master Tournament State */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚡</span> Tournament State Switcher
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Updates connected screens and Team Leader view instantly.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
            <Button
              variant={eventState?.state === 'LIVE' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('LIVE')}
              disabled={actionLoading}
            >
              🟢 SET LIVE
            </Button>
            <Button
              variant={eventState?.state === 'PAUSED' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('PAUSED')}
              disabled={actionLoading}
            >
              ⏸️ PAUSE EVENT
            </Button>
            <Button
              variant={eventState?.state === 'INTERMISSION' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('INTERMISSION')}
              disabled={actionLoading}
            >
              ☕ INTERMISSION
            </Button>
            <Button
              variant={eventState?.state === 'TIE_BREAKER' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('TIE_BREAKER')}
              disabled={actionLoading}
            >
              ⚖️ TIE BREAKER
            </Button>
            <Button
              variant={eventState?.state === 'FINAL_REVEAL' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('FINAL_REVEAL')}
              disabled={actionLoading}
            >
              🥇 PODIUM REVEAL
            </Button>
            <Button
              variant={eventState?.state === 'COMPLETED' ? 'gold' : 'secondary'}
              size="sm"
              onClick={() => setOverallState('COMPLETED')}
              disabled={actionLoading}
            >
              🏁 EVENT COMPLETE
            </Button>
          </div>
        </div>

        {/* Module 2: Official Server Timer Engine */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 17, 24, 0.95) 100%)',
            border: '1px solid var(--border-gold)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              ⏱️ Master Timer Engine
            </h2>
            <Badge variant={eventState?.timer_state === 'running' ? 'live' : 'subtle'}>
              {eventState?.timer_state?.toUpperCase() || 'STOPPED'}
            </Badge>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '1.25rem 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '3rem',
              fontWeight: 900,
              color: localTimer <= 10 && eventState?.timer_state === 'running' ? '#ef4444' : 'var(--gold)',
              letterSpacing: '0.05em',
            }}
          >
            {formatTime(localTimer)}
          </div>

          {/* Timer Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {eventState?.timer_state === 'running' ? (
              <Button variant="outline" size="sm" onClick={() => updateTimerState('paused')} disabled={actionLoading}>
                ⏸️ Pause Timer
              </Button>
            ) : (
              <Button variant="gold" size="sm" onClick={() => updateTimerState('running')} disabled={actionLoading}>
                ▶️ Start Timer
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => resetTimer(eventState?.timer_duration_seconds || 60)} disabled={actionLoading}>
              🔄 Reset ({eventState?.timer_duration_seconds || 60}s)
            </Button>
          </div>

          {/* Quick Preset Durations */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Presets:</span>
            {[30, 45, 60, 90, 120, 300].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => resetTimer(sec)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Module 3: Broadcast Announcement Banner */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            📢 Live Broadcast Banner
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Overlays critical instructions across live screens and Team Leader dashboards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              value={bannerInput}
              onChange={(e) => setBannerInput(e.target.value)}
              placeholder="e.g. Round 2 begins in 3 minutes. Verify squad roster."
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="primary" size="sm" onClick={broadcastBanner} disabled={actionLoading} style={{ flex: 1 }}>
                Push Broadcast Banner
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBannerInput('');
                  updateEventState({ banner_message: null });
                }}
                disabled={actionLoading}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Module 4: Active Round & Question Broadcast Module */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          🎯 Round & Question Broadcast Control
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Select the official active round and push individual questions to Team Leader terminals.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Round Selector */}
          <div className="form-group">
            <label className="form-label">Active Round</label>
            <select
              className="form-input"
              value={selectedRoundId}
              onChange={(e) => {
                setSelectedRoundId(e.target.value);
                setSelectedQuestionId('');
              }}
            >
              <option value="">-- Choose Round to Broadcast --</option>
              {rounds.map((r, i) => (
                <option key={r.id} value={r.id}>
                  Round {r.round_number || i + 1}: {r.name} ({r.type.toUpperCase()}) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Question Selector */}
          <div className="form-group">
            <label className="form-label">Target Question</label>
            <select
              className="form-input"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              disabled={questions.length === 0}
            >
              <option value="">-- Select Question (Optional / All Round) --</option>
              {questions.map((q, idx) => (
                <option key={q.id} value={q.id}>
                  Q{q.question_number || idx + 1}: {q.question_text.substring(0, 60)}... ({q.points} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="gold" size="md" onClick={broadcastRoundAndQuestion} disabled={actionLoading || !selectedRoundId}>
            🚀 Broadcast Round & Questions to Arena
          </Button>
        </div>
      </div>
    </div>
  );
}
