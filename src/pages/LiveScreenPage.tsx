import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { EventState, Question, AuctionItem, Team, WinnerReveal, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatINR } from '../lib/currency';

export function LiveScreenPage() {
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeAuctionItem, setActiveAuctionItem] = useState<AuctionItem | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
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

      // Fetch all teams for Live Team Status table
      if (edData?.id) {
        const { data: tData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', edData.id)
          .order('name', { ascending: true });

        if (tData) setTeams(tData as Team[]);

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
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Connecting to Auditorium Live Broadcast Feed..." />
      </div>
    );
  }

  const p1 = podiumReveals.find((r) => r.position === 1);
  const p2 = podiumReveals.find((r) => r.position === 2);
  const p3 = podiumReveals.find((r) => r.position === 3);

  const state = eventState?.state || 'NOT_STARTED';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        color: 'var(--text-primary)',
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
          borderBottom: '1px solid var(--border-subtle)',
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
              background: 'var(--accent-cyan)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.5rem',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
            }}
          >
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em', fontWeight: 800 }}>
              GEN CODE LEAGUE
            </h1>
            <span style={{ fontSize: '0.875rem', color: 'var(--accent-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
              {currentEdition?.name || 'Grand Championship'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {state === 'LIVE' ? (
             <Badge variant="live" pulse>LIVE AUCTION</Badge>
          ) : state === 'FINAL_REVEAL' || state === 'COMPLETED' ? (
             <Badge variant="qualified">CHAMPIONSHIP COMPLETED</Badge>
          ) : (
             <Badge variant="subtle">{state.replace(/_/g, ' ')}</Badge>
          )}
        </div>
      </header>

      {/* Broadcast Announcement Bar */}
      {eventState?.banner_message && (
        <div
          style={{
            background: 'var(--status-warning-bg)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 2rem',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--status-warning)',
            marginBottom: '2.5rem',
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.1)',
          }}
        >
          📢 {eventState.banner_message}
        </div>
      )}

      {/* Dynamic Main View Switcher */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {state === 'NOT_STARTED' && (
          <div className="event-setup-screen">
            <div className="event-setup-screen__icon">⚙️</div>
            <h2 className="event-setup-screen__title">EVENT SETUP</h2>
            <div className="event-setup-screen__subtitle">Configuration In Progress...</div>
            <div className="loading-bar">
              <div className="loading-bar__fill"></div>
            </div>
          </div>
        )}

        {state === 'NOT_STARTED' && eventState?.banner_message?.includes('AUCTION STARTING') && (
          <div className="event-setup-screen">
            <Badge variant="live" pulse style={{ fontSize: '1.25rem', padding: '0.5rem 1rem' }}>OFFICIAL AUCTION</Badge>
            <h2 className="event-setup-screen__title" style={{ fontSize: '3.5rem', color: 'var(--accent-cyan)' }}>
              AUCTION STARTING SOON
            </h2>
            <div className="event-setup-screen__subtitle" style={{ fontSize: '1.25rem' }}>Prepare Your Bids</div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px' }}>
               {teams.map(team => (
                 <Badge key={team.id} variant="subtle" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                   {team.name}
                 </Badge>
               ))}
            </div>
          </div>
        )}

        {(state === 'INTERMISSION' || state === 'PAUSED') && (
          <div className="event-setup-screen">
            <h2 className="event-setup-screen__title" style={{ fontSize: '2.5rem' }}>
              RESULTS WILL BE ANNOUNCED SOON
            </h2>
            <div className="event-setup-screen__subtitle" style={{ fontSize: '1.25rem', color: 'var(--accent-yellow)' }}>
              ⚠️ BUDGETS ARE RESETTING ⚠️
            </div>
          </div>
        )}

        {state === 'FINAL_REVEAL' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', textAlign: 'center', margin: 0 }}>
              🏆 OFFICIAL CEREMONY PODIUM REVEAL 🏆
            </h2>

            <div className="podium" style={{ width: '100%', maxWidth: '1100px', marginTop: '1.5rem', gap: '2rem' }}>
              {/* 2nd Place */}
              <div className="podium__place">
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>1st Runner Up</div>
                <div className="podium__pedestal podium__pedestal--2nd">
                  {p2?.is_revealed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="podium__trophy">🥈</div>
                      <div className="podium__team-name">{p2.team?.name}</div>
                      <div className="podium__score">{p2.team?.score} pts</div>
                    </div>
                  ) : (
                    <div className="podium__hidden">?</div>
                  )}
                </div>
              </div>

              {/* 1st Place */}
              <div className="podium__place">
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-yellow)', marginBottom: '0.5rem' }}>GRAND CHAMPION</div>
                <div className="podium__pedestal podium__pedestal--1st">
                  {p1?.is_revealed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="podium__trophy">👑</div>
                      <div className="podium__team-name" style={{ fontSize: '1.25rem' }}>{p1.team?.name}</div>
                      <div className="podium__score" style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.6)', fontWeight: 800 }}>{p1.team?.score} pts</div>
                    </div>
                  ) : (
                    <div className="podium__hidden">?</div>
                  )}
                </div>
              </div>

              {/* 3rd Place */}
              <div className="podium__place">
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f97316', marginBottom: '0.5rem' }}>2nd Runner Up</div>
                <div className="podium__pedestal podium__pedestal--3rd">
                  {p3?.is_revealed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="podium__trophy">🥉</div>
                      <div className="podium__team-name">{p3.team?.name}</div>
                      <div className="podium__score">{p3.team?.score} pts</div>
                    </div>
                  ) : (
                    <div className="podium__hidden">?</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(state === 'LIVE') && activeAuctionItem && (
          <div style={{ display: 'flex', gap: '2rem', height: '100%', alignItems: 'center' }}>
            {/* Left Column: Auction Lot Details */}
            <div
              className="gcl-card"
              style={{
                flex: 1,
                padding: '3rem',
                border: '2px solid var(--accent-blue)',
                boxShadow: '0 0 40px rgba(37, 99, 235, 0.15)',
              }}
            >
              <div className="round-question-header">
                <span className="round-question-header__text">
                  ROUND {eventState?.current_round?.round_number || 1} | ITEM {activeAuctionItem.id}
                </span>
                <Badge variant={eventState?.timer_state === 'running' ? 'live' : 'subtle'} pulse={eventState?.timer_state === 'running'}>
                  {eventState?.timer_state === 'running' ? 'BIDDING OPEN' : 'PAUSED'}
                </Badge>
              </div>

              <h2 style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', margin: '1rem 0' }}>
                {activeAuctionItem.name}
              </h2>
              
              <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {activeAuctionItem.description}
              </div>

              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '2rem'
                }}
              >
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  CURRENT HIGHEST BID
                </div>
                <div
                  style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-cyan)',
                    lineHeight: 1,
                    margin: '1rem 0',
                  }}
                >
                  {formatINR(eventState?.current_bid_amount || activeAuctionItem.base_price)}
                </div>
                <div style={{ fontSize: '1.5rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                  {eventState?.current_bid_team?.name || 'Base Reserve (No bids yet)'}
                </div>
              </div>
              
              {/* Massive Timer */}
              {(eventState?.timer_state === 'running' || localSeconds > 0) && (
                <div className={`competition-timer ${localSeconds <= 10 ? 'competition-timer--danger' : ''}`}>
                  {formatTimer(localSeconds)}
                </div>
              )}
            </div>

            {/* Right Column: Live Team Status */}
            <div className="gcl-card" style={{ width: '400px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="gcl-card__header">
                <span className="gcl-card__icon">📊</span>
                <h3 className="gcl-card__title">Live Team Status</h3>
              </div>
              <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="gcl-table team-status-table">
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th style={{ textAlign: 'right' }}>Total Spent</th>
                      <th style={{ textAlign: 'right' }}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map(team => (
                      <tr key={team.id}>
                        <td className="team-name">{team.name}</td>
                        <td className="value-spent" style={{ textAlign: 'right' }}>{formatINR(team.total_spent)}</td>
                        <td className="value-remaining" style={{ textAlign: 'right' }}>{formatINR(team.remaining_budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
