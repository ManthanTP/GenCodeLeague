import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { EventState, Question, AuctionItem, Team, WinnerReveal, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function LiveScreenPage() {
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeAuctionItem, setActiveAuctionItem] = useState<AuctionItem | null>(null);
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [podiumReveals, setPodiumReveals] = useState<WinnerReveal[]>([]);
  const [loading, setLoading] = useState(true);

  // Local synced countdown
  const [localSeconds, setLocalSeconds] = useState<number>(60);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadLiveStream();

    const channel = supabase
      .channel('live-projector-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => {
        loadLiveStream();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'winner_reveals' }, () => {
        loadLiveStream();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadLiveStream();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function loadLiveStream() {
    try {
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();

      if (edData) setCurrentEdition(edData as Edition);

      // Event state
      const { data: stateData } = await supabase
        .from('event_state')
        .select('*, current_round:rounds(*), current_question:questions(*), active_auction_item:auction_items(*), current_bid_team:teams(*)')
        .limit(1)
        .maybeSingle();

      if (stateData) {
        setEventState(stateData as EventState);
        setLocalSeconds(stateData.timer_remaining_seconds || 60);

        if (stateData.current_question) {
          setActiveQuestion(stateData.current_question as Question);
        } else {
          setActiveQuestion(null);
        }

        if (stateData.active_auction_item) {
          setActiveAuctionItem(stateData.active_auction_item as AuctionItem);
        } else {
          setActiveAuctionItem(null);
        }
      }

      // Top 5 teams for leaderboard view
      if (edData?.id) {
        const { data: tData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', edData.id)
          .order('score', { ascending: false })
          .limit(8);

        if (tData) setTopTeams(tData as Team[]);

        // Podium reveals
        const { data: revData } = await supabase
          .from('winner_reveals')
          .select('*, team:teams(*)')
          .eq('edition_id', edData.id)
          .order('position', { ascending: true });

        if (revData) setPodiumReveals(revData as unknown as WinnerReveal[]);
      }
    } catch (err) {
      console.error('Error loading projector stream:', err);
    } finally {
      setLoading(false);
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

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Connecting to Auditorium Live Broadcast Feed..." />
      </div>
    );
  }

  const p1 = podiumReveals.find((r) => r.position === 1);
  const p2 = podiumReveals.find((r) => r.position === 2);
  const p3 = podiumReveals.find((r) => r.position === 3);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #141724 0%, #05070a 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        padding: '2.5rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Projector Branding Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.25rem',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
            }}
          >
            GCL
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>
              GEN CODE LEAGUE
            </h1>
            <span style={{ fontSize: '0.875rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
              {currentEdition?.name || 'Grand Championship'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Badge
            variant={
              eventState?.state === 'LIVE'
                ? 'live'
                : eventState?.state === 'FINAL_REVEAL'
                ? 'gold'
                : 'subtle'
            }
            pulse={eventState?.state === 'LIVE' || eventState?.state === 'FINAL_REVEAL'}
          >
            {eventState?.state || 'OFFLINE'}
          </Badge>

          {/* Huge Timer if active */}
          {(eventState?.state === 'LIVE' || eventState?.timer_state === 'running') && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '3rem',
                fontWeight: 900,
                color: localSeconds <= 10 ? '#ef4444' : 'var(--gold)',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}
            >
              {formatTimer(localSeconds)}
            </div>
          )}
        </div>
      </header>

      {/* Broadcast Announcement Bar */}
      {eventState?.banner_message && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 2rem',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--gold)',
            marginBottom: '2.5rem',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.1)',
          }}
        >
          📢 {eventState.banner_message}
        </div>
      )}

      {/* Dynamic Main View Switcher */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* CASE 1: PODIUM FINAL REVEAL */}
        {eventState?.state === 'FINAL_REVEAL' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--gold)', textAlign: 'center', margin: 0 }}>
              🏆 OFFICIAL CEREMONY PODIUM REVEAL 🏆
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '2rem',
                width: '100%',
                maxWidth: '1100px',
                alignItems: 'flex-end',
                marginTop: '1.5rem',
              }}
            >
              {/* 2nd Place */}
              <div
                style={{
                  height: '320px',
                  background: p2?.is_revealed
                    ? 'linear-gradient(180deg, rgba(148, 163, 184, 0.2) 0%, rgba(15, 17, 24, 0.95) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: p2?.is_revealed ? '2px solid #94a3b8' : '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🥈</div>
                <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  1st Runner Up
                </div>
                {p2?.is_revealed ? (
                  <>
                    <h3 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-display)', margin: '0.75rem 0 0.25rem 0' }}>
                      {p2.team?.name || 'Declared Team'}
                    </h3>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 800 }}>
                      {p2.team?.score} pts
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '1rem' }}>
                    ??? CONCEALED ???
                  </div>
                )}
              </div>

              {/* 1st Place - Champion */}
              <div
                style={{
                  height: '420px',
                  background: p1?.is_revealed
                    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.25) 0%, rgba(15, 17, 24, 0.98) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: p1?.is_revealed ? '3px solid var(--border-gold)' : '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: p1?.is_revealed ? '0 0 50px rgba(245, 158, 11, 0.3)' : 'none',
                }}
              >
                <div style={{ fontSize: '4.5rem', marginBottom: '0.5rem' }}>👑</div>
                <div style={{ fontSize: '1.125rem', color: 'var(--gold)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  GCL GRAND CHAMPION
                </div>
                {p1?.is_revealed ? (
                  <>
                    <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '1rem 0 0.5rem 0', color: '#fff' }}>
                      {p1.team?.name || 'Champion Team'}
                    </h3>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 900 }}>
                      {p1.team?.score} POINTS
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '1.5rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '1.5rem' }}>
                    ??? CONCEALED ???
                  </div>
                )}
              </div>

              {/* 3rd Place */}
              <div
                style={{
                  height: '280px',
                  background: p3?.is_revealed
                    ? 'linear-gradient(180deg, rgba(180, 83, 9, 0.2) 0%, rgba(15, 17, 24, 0.95) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: p3?.is_revealed ? '2px solid #b45309' : '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥉</div>
                <div style={{ fontSize: '1rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                  2nd Runner Up
                </div>
                {p3?.is_revealed ? (
                  <>
                    <h3 style={{ fontSize: '1.625rem', fontFamily: 'var(--font-display)', margin: '0.75rem 0 0.25rem 0' }}>
                      {p3.team?.name || 'Declared Team'}
                    </h3>
                    <div style={{ fontSize: '1.125rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 800 }}>
                      {p3.team?.score} pts
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '1rem' }}>
                    ??? CONCEALED ???
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeAuctionItem ? (
          /* CASE 2: LIVE AUCTION LOT ON STAGE */
          <div
            style={{
              maxWidth: '1000px',
              margin: '0 auto',
              width: '100%',
              background: 'rgba(15, 17, 24, 0.9)',
              border: '2px solid var(--border-gold)',
              borderRadius: '24px',
              padding: '3.5rem',
              boxShadow: '0 0 60px rgba(245, 158, 11, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <Badge variant="live" pulse style={{ fontSize: '1rem', padding: '0.5rem 1rem', marginBottom: '0.75rem' }}>
                  LIVE AUCTION LOT
                </Badge>
                <h2 style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', margin: '0.5rem 0' }}>
                  {activeAuctionItem.name}
                </h2>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                  {activeAuctionItem.category}
                </span>
              </div>

              {/* Massive Bid Display */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '16px',
                  padding: '1.5rem 2.5rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current Highest Bid
                </div>
                <div
                  style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--gold)',
                    lineHeight: 1,
                    margin: '0.5rem 0',
                  }}
                >
                  {eventState?.current_bid_amount || activeAuctionItem.base_price} <span style={{ fontSize: '1.5rem' }}>cr</span>
                </div>
                <div style={{ fontSize: '1.25rem', color: '#34d399', fontWeight: 700 }}>
                  {eventState?.current_bid_team?.name || 'Base Reserve (No bids yet)'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '1.375rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {activeAuctionItem.description}
            </p>

            {activeAuctionItem.skills && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {activeAuctionItem.skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--gold)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : activeQuestion ? (
          /* CASE 3: LIVE QUIZ QUESTION */
          <div
            style={{
              maxWidth: '1000px',
              margin: '0 auto',
              width: '100%',
              background: 'rgba(15, 17, 24, 0.9)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '24px',
              padding: '3.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <Badge variant="live" pulse style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                QUESTION #{activeQuestion.question_number || 1}
              </Badge>
              <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 800 }}>
                {activeQuestion.points} POINTS
              </div>
            </div>

            <h2 style={{ fontSize: '2.25rem', lineHeight: 1.4, margin: '0 0 2.5rem 0', fontWeight: 700 }}>
              {activeQuestion.question_text}
            </h2>

            {activeQuestion.options && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                {activeQuestion.options.map((opt, i) => {
                  const optText = typeof opt === 'string' ? opt : opt.text;
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '1.25rem 1.75rem',
                        borderRadius: '12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: 'var(--gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                        }}
                      >
                        {letter}
                      </span>
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* CASE 4: LEADERBOARD & INTERMISSION */
          <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '2rem' }}>
              TOURNAMENT LEADERBOARD
            </h2>

            <div
              style={{
                background: 'rgba(15, 17, 24, 0.95)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', width: '80px', fontSize: '1rem' }}>Rank</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '1rem' }}>Team</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '1rem' }}>Institution</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '1rem' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topTeams.map((team, idx) => (
                    <tr key={team.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem' }}>
                        #{team.rank || idx + 1}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                        {team.name}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        {team.college || '—'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold)' }}>
                        {team.score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>Gen Code League &bull; Official Arena Presentation Stream</span>
        <span>Realtime Sync: Supabase Engine</span>
      </footer>
    </div>
  );
}
