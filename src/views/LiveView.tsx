import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  UserCircle,
  Wallet,
  Hammer,
  Medal,
  Award,
  Crown,
  Clock,
  Users,
  Maximize,
  Minimize,
  Coins,
  Package,
  Box,
  ChevronDown,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTeamItems } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import { useLeaderboardReveal } from '../hooks/useLeaderboardReveal';
import Header from '../components/Header';
import LiveTeamStatus from '../components/LiveTeamStatus';
import { formatCurrency, renderMultiLineText } from '../utils/formatters';
import { DEFAULT_ROUNDS_DATA, getRoundBasePrice } from '../data/roundsData';
import type { PastRoundSnapshot, LeaderboardRevealEntry, TeamMember, Team } from '../types/database';

export default function LiveView() {
  const navigate = useNavigate();
  const { eventState, edition, loading: stateLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const { items } = useTeamItems(edition?.id);
  const { reveals: r1Reveals } = useLeaderboardReveal(edition?.id, 0);
  const {
    formatted: timerFormatted,
    isRunning: isTimerRunning,
    isPaused: isTimerPaused,
    isRevealed,
    isExpired,
  } = useTimer(eventState);

  const { profile } = useAuth();
  const isTeamLeader = profile?.role === 'team_leader' && Boolean(profile.team_id);
  const isAdmin = profile?.role === 'admin';

  // Selected personal team ID for viewer and panel visibility
  const [myTeamId, setMyTeamId] = useState<string>('');
  const [isTeamPanelOpen, setIsTeamPanelOpen] = useState<boolean>(false);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});

  // Team Leader is automatically bound to their own team
  useEffect(() => {
    if (isTeamLeader && profile?.team_id) {
      setMyTeamId(profile.team_id);
      setIsTeamPanelOpen(true);
    }
  }, [isTeamLeader, profile?.team_id]);

  // Load team members for selected team and rosters
  useEffect(() => {
    if (!teams || teams.length === 0) return;
    const teamIds = teams.map((t) => t.id);
    supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const map: Record<string, TeamMember[]> = {};
          data.forEach((m: TeamMember) => {
            if (!map[m.team_id]) map[m.team_id] = [];
            map[m.team_id].push(m);
          });
          setTeamMembersMap(map);
        }
      });
  }, [teams]);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Map items to teams to get live spent & won items count
  const teamsWithStats = useMemo(() => {
    return teams.map((team) => {
      const teamItems = items.filter((item) => item.team_id === team.id);
      const spent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      return {
        ...team,
        itemsCount: teamItems.length,
        totalSpent: spent,
      };
    });
  }, [teams, items]);

  // Totals for header
  const totalSpent = useMemo(
    () => teamsWithStats.reduce((acc, t) => acc + t.totalSpent, 0),
    [teamsWithStats]
  );
  const totalAvailable = useMemo(
    () => teamsWithStats.reduce((acc, t) => acc + t.budget, 0),
    [teamsWithStats]
  );

  // Parse past rounds & podium state from event_state.banner_message
  const { pastRounds, podiumState, bannerReveals } = useMemo(() => {
    let past: PastRoundSnapshot[] = [];
    let podium = {
      thirdTeamId: null as string | null,
      thirdTeamName: null as string | null,
      thirdRevealed: false,
      secondTeamId: null as string | null,
      secondTeamName: null as string | null,
      secondRevealed: false,
      firstTeamId: null as string | null,
      firstTeamName: null as string | null,
      firstRevealed: false,
    };
    let bReveals: LeaderboardRevealEntry[] = [];

    if (!eventState?.banner_message) return { pastRounds: past, podiumState: podium, bannerReveals: bReveals };
    try {
      const parsed = JSON.parse(eventState.banner_message);
      if (Array.isArray(parsed)) {
        past = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.pastRounds)) past = parsed.pastRounds;
        if (parsed.podium) podium = { ...podium, ...parsed.podium };
        if (parsed.firstRevealed !== undefined || parsed.thirdRevealed !== undefined) {
          podium = { ...podium, ...parsed };
        }
        if (Array.isArray(parsed.r1Reveals)) bReveals = parsed.r1Reveals;
      }
    } catch {
      // not json, return defaults
    }
    return { pastRounds: past, podiumState: podium, bannerReveals: bReveals };
  }, [eventState?.banner_message]);

  // Resilient real-time reveal state across direct hook and broadcast banner_message
  const effectiveReveals = useMemo(() => {
    if (r1Reveals && r1Reveals.length > 0) {
      if (bannerReveals && bannerReveals.length > 0) {
        return r1Reveals.map((r) => {
          const fromBanner = bannerReveals.find((br) => br.position === r.position);
          if (fromBanner && fromBanner.is_revealed && !r.is_revealed) {
            return fromBanner;
          }
          return r;
        });
      }
      return r1Reveals;
    }
    return bannerReveals;
  }, [r1Reveals, bannerReveals]);

  const currentRoundIndex = eventState?.current_round_index ?? 0;

  // Current Round Stats for LiveView (Sorted A to Z)
  const currentRoundStats = useMemo(() => {
    return teams.map((team) => {
      const roundTeamItems = items.filter(
        (it) => it.team_id === team.id && it.round_index === currentRoundIndex
      );
      const roundScore = roundTeamItems.filter((it) => it.is_correct).length;
      const roundItemsCount = roundTeamItems.length;
      const roundSpent = roundTeamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      return {
        ...team,
        roundScore,
        roundItemsCount,
        roundSpent,
        remainingBudget: team.budget,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [teams, items, currentRoundIndex]);

  // Overall Stats across ALL rounds combined (Sorted strictly A to Z, not rank)
  const overallStats = useMemo(() => {
    return teams.map((team) => {
      const allTeamItems = items.filter((it) => it.team_id === team.id);
      const totalScore = team.score || 0;
      const totalItems = allTeamItems.length;
      const totalSpent = allTeamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const totalRemaining = team.budget;

      return {
        ...team,
        totalScore,
        totalItems,
        totalSpent,
        totalRemaining,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [teams, items]);

  // Available teams from Supabase
  const availableTeams = useMemo(() => {
    return teams || [];
  }, [teams]);

  // Sorted teams for dropdown selects (A to Z)
  const sortedTeamsDropdown = useMemo(() => {
    return [...availableTeams].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [availableTeams]);

  // Last successful bid derived from team_items (Result: Correct/Incorrect hidden from live view)
  const lastBidDetails = useMemo(() => {
    if (!items || items.length === 0) return null;
    const lastItem = items[0]; // sorted by created_at desc
    const team = availableTeams.find((t) => t.id === lastItem.team_id);
    return {
      teamName: team?.name || 'Unknown Team',
      questionRef: lastItem.question_ref || `R${lastItem.round_index + 1} - Q${lastItem.question_index + 1}`,
      amount: formatCurrency(lastItem.cost),
      status: lastItem.is_correct ? 'correct' : 'wrong',
    };
  }, [items, availableTeams]);

  // Personal team stats for viewer (Scores and ranks completely hidden)
  const myTeamStats = useMemo(() => {
    if (!myTeamId) return null;
    return teamsWithStats.find((t) => t.id === myTeamId) || null;
  }, [teamsWithStats, myTeamId]);

  // Selected Team for Right Sidebar - ONLY available when selected & open!
  const selectedTeam = useMemo(() => {
    if (!myTeamId || !isTeamPanelOpen) return null;
    return availableTeams.find((t) => t.id === myTeamId) || null;
  }, [availableTeams, myTeamId, isTeamPanelOpen]);

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return teamMembersMap[selectedTeam.id] || [];
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamLeader = useMemo(() => {
    if (!selectedTeam) return '';
    const members = teamMembersMap[selectedTeam.id] || [];
    const captain = members.find((m) => m.is_captain);
    return captain?.name || (captain as any)?.full_name || members[0]?.name || (members[0] as any)?.full_name || '';
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamWonItems = useMemo(() => {
    if (!selectedTeam) return [];
    return items.filter((it) => it.team_id === selectedTeam.id);
  }, [selectedTeam, items]);

  const selectedTeamSpent = useMemo(() => {
    if (!selectedTeam) return 0;
    return selectedTeamWonItems.reduce((acc, it) => acc + (it.cost || 0), 0);
  }, [selectedTeam, selectedTeamWonItems]);

  const handleSelectTeam = (id: string) => {
    setMyTeamId(id);
    setIsTeamPanelOpen(Boolean(id));
  };

  const handleCloseTeamPanel = () => {
    setIsTeamPanelOpen(false);
    if (!isTeamLeader) {
      setMyTeamId('');
    }
  };

  const previousBidsList = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(0, 3).map((item, idx) => {
      const team = teams.find((t) => t.id === item.team_id);
      const timeStr = item.created_at
        ? new Date(item.created_at).toLocaleTimeString('en-US', { hour12: false })
        : '--:--:--';
      return {
        id: item.id || String(idx),
        index: idx + 1,
        teamName: team?.name || 'Unknown Team',
        amount: formatCurrency(item.cost),
        time: timeStr,
      };
    });
  }, [items, teams]);

  const gameState = eventState?.game_state || 'setup';
  const roundIdx = eventState?.current_round_index ?? 0;
  const isAfterRound3 = pastRounds.some((r) => r.roundIndex === 2) || roundIdx >= 3;
  const questionIdx = eventState?.current_question_index ?? 0;
  const currentRound = DEFAULT_ROUNDS_DATA[roundIdx] || {
    name: `Round ${roundIdx + 1}`,
    questions: [],
  };
  const totalQuestions = currentRound.questions.length || 20;

  // Active bid preview
  const currentBidPreview = eventState?.current_bid_preview;
  const activeBidTeam = currentBidPreview
    ? teams.find((t) => t.id === currentBidPreview.teamId)
    : null;

  // Round base price
  const roundBasePrice = getRoundBasePrice(roundIdx);

  // Check if current question is already sold in team_items
  const alreadySoldItem = useMemo(() => {
    if (!items || items.length === 0) return null;
    return items.find(
      (it) =>
        it.round_index === roundIdx &&
        it.question_index === questionIdx
    ) || null;
  }, [items, roundIdx, questionIdx]);

  const soldBuyerTeam = useMemo(() => {
    if (!alreadySoldItem || !teams) return null;
    return teams.find((t) => t.id === alreadySoldItem.team_id) || null;
  }, [alreadySoldItem, teams]);

  const isQuestionSold = Boolean(alreadySoldItem);
  const isBiddingActive = Boolean(currentBidPreview && currentBidPreview.amount > 0);
  const hasCurrentBid = Boolean(isBiddingActive || (isQuestionSold && alreadySoldItem));
  const hasPreviousBids = Boolean(previousBidsList && previousBidsList.length > 0);
  const showBidRow = hasCurrentBid || hasPreviousBids;

  if (stateLoading) {
    return (
      <div className="gcl-loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Connecting to Live Auction...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen text-white font-sans gcl-page-enter ${isFullscreen ? 'gcl-fullscreen-active' : ''}`}
      style={{
        backgroundColor: '#08090d',
        ...(isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              overflowY: 'auto',
              width: '100vw',
              minHeight: '100vh',
            }
          : {}),
      }}
    >
      <Header
        totalSpent={totalSpent}
        totalAvailable={totalAvailable}
        teamCount={teams.length}
        viewMode="live"
        isFullscreen={isFullscreen}
        onExitFullscreen={toggleFullscreen}
        currentRoundName={currentRound.name}
        questionIdx={questionIdx}
        totalQuestions={totalQuestions}
      />

      {/* 1. SETUP STATE */}
      {gameState === 'setup' && (
        <div className="live-centered-screen">
          <div className="text-center space-y-6 max-w-4xl z-10">
            <div className="inline-block mb-4">
              <Settings size={64} className="text-red-500 animate-spin-slow mx-auto" />
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter gcl-display">
              EVENT SETUP
            </h1>
            <div className="divider-red"></div>
            <p className="text-xl text-slate-400 font-mono uppercase tracking-widest animate-pulse">
              Configuration in Progress...
            </p>
          </div>
        </div>
      )}

      {/* 2. WAITING START STATE */}
      {gameState === 'waiting_start' && (
        <div className="live-centered-screen">
          <div className="text-center space-y-6 max-w-4xl z-10 px-4">
            <div className="inline-block mb-2">
              <span className="badge-official">Official Auction</span>
            </div>
            <h1 className="grand-title">
              GEN<span className="brand-heading-accent">CODE</span>
              <br />
              LEAGUE
            </h1>
            <div className="divider-red"></div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white uppercase tracking-widest animate-bounce gcl-display">
              Auction Starting Soon
            </h2>

            {/* Team Selector on Waiting Screen */}
            <div className="team-selector-card">
              <p className="team-selector-label">
                <UserCircle size={20} /> Join as Team (Optional)
              </p>
              <select
                value={myTeamId}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="gcl-select"
              >
                <option value="">-- I am just a viewer --</option>
                {sortedTeamsDropdown.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE ROUND STATE (EXACT 1-TO-1 MATCH TO REFERENCE PHOTO media_1790926182172.jpg) */}
      {gameState === 'active' && (
        <div style={{ maxWidth: '1720px', margin: '0 auto', padding: '0.65rem 1.5rem 2rem 1.5rem' }}>
          {/* Top Right Controls: ONE Unified Team Selector & Fullscreen button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginBottom: '0.75rem' }}>
            {!isTeamLeader && (
              <div style={{ position: 'relative' }}>
                <select
                  value={myTeamId}
                  onChange={(e) => handleSelectTeam(e.target.value)}
                  style={{
                    background: '#13141a',
                    border: '1px solid #262732',
                    color: myTeamId ? '#ffffff' : '#cbd5e1',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.4rem 2rem 0.4rem 0.85rem',
                    borderRadius: '8px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}
                >
                  <option value="">Viewing as Guest (Select Team)</option>
                  {sortedTeamsDropdown.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                padding: '0.4rem',
                background: '#13141a',
                border: '1px solid #262732',
                borderRadius: '8px',
                color: isFullscreen ? '#e0263f' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title={isFullscreen ? 'Exit Presentation Mode' : 'Enter Presentation Mode (Fullscreen)'}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>

          {/* Main Arena Dynamic Grid */}
          <div
            className={`gcl-live-arena-grid ${isTeamPanelOpen && selectedTeam ? 'has-panel' : 'no-panel'}`}
          >
            {/* MAIN CONTENT AREA: 75.6% when Selected Team panel is open, 100% full width when closed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minWidth: 0 }}>
              {/* 1. Question / Item Box with Red Diagonal Laser Streak */}
              <div
                style={{
                  background: '#0c0d12',
                  border: isQuestionSold
                    ? '1.5px solid rgba(239, 68, 68, 0.6)'
                    : isBiddingActive
                    ? '1.5px solid rgba(224, 38, 63, 0.65)'
                    : '1px solid #1e1f29',
                  borderRadius: '16px',
                  padding: '1.4rem 1.6rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Red laser light cut on left edge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '150px',
                    height: '100%',
                    pointerEvents: 'none',
                    background: isQuestionSold
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0.08) 35%, transparent 65%)'
                      : 'linear-gradient(135deg, rgba(224, 38, 63, 0.4) 0%, rgba(224, 38, 63, 0.08) 35%, transparent 65%)',
                    borderLeft: isQuestionSold ? '3px solid #ef4444' : '3px solid #e0263f',
                  }}
                />

                {/* Top Bar inside Question Card: Ref Left, Bid Timer Right */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', position: 'relative', zIndex: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.08em' }}>
                      <span
                        style={{
                          color: '#ffffff',
                          fontWeight: 800,
                          borderBottom: '2.5px solid #e0263f',
                          paddingBottom: '2px',
                          display: 'inline-block',
                        }}
                      >
                        {currentRound.name.toUpperCase()}
                      </span>
                      <span style={{ color: '#475569' }}>|</span>
                      <span style={{ color: '#64748b' }}>QUESTION {questionIdx + 1} OF {totalQuestions}</span>
                    </div>

                    {/* Question Status Tag */}
                    <div>
                      {isQuestionSold ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 800,
                            border: '1px solid rgba(239, 68, 68, 0.55)',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            letterSpacing: '0.06em',
                          }}
                        >
                          ✓ SOLD TO {soldBuyerTeam?.name?.toUpperCase() || 'TEAM'} ({formatCurrency(alreadySoldItem?.cost || 0)})
                        </span>
                      ) : isBiddingActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 800,
                            border: '1px solid rgba(224, 38, 63, 0.6)',
                            background: 'rgba(224, 38, 63, 0.2)',
                            color: '#f87171',
                            letterSpacing: '0.06em',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} className="animate-ping" />
                          LIVE BIDDING
                        </span>
                      ) : isRevealed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 800,
                            border: '1px solid rgba(34, 197, 94, 0.45)',
                            background: 'rgba(34, 197, 94, 0.12)',
                            color: '#4ade80',
                            letterSpacing: '0.06em',
                          }}
                        >
                          ● BIDDING OPEN
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 800,
                            border: '1px solid #334155',
                            background: 'rgba(30, 41, 59, 0.6)',
                            color: '#94a3b8',
                            letterSpacing: '0.06em',
                          }}
                        >
                          🔒 QUESTION LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BID TIMER Corner Widget */}
                  <div
                    style={{
                      background: '#101117',
                      border: '1px solid #22232d',
                      borderRadius: '12px',
                      padding: '0.55rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '145px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e0263f' }}>
                      <Clock size={12} className={isTimerRunning ? 'text-[#e0263f] animate-spin-slow' : 'text-[#e0263f]'} />
                      <span>BID TIMER</span>
                    </div>
                    <div
                      style={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.05em',
                        marginTop: '0.1rem',
                        lineHeight: 1,
                        color: isExpired ? '#ef4444' : '#ffffff',
                      }}
                    >
                      {timerFormatted || '00:00'}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '3.5px',
                        backgroundColor: '#e0263f',
                        borderRadius: '2px',
                        marginTop: '0.35rem',
                        boxShadow: '0 0 10px rgba(224, 38, 63, 0.7)',
                      }}
                    />
                  </div>
                </div>

                {/* Main Question Text */}
                <div style={{ marginTop: '0.9rem', marginBottom: '0.25rem', position: 'relative', zIndex: 10 }}>
                  {isRevealed || isQuestionSold ? (
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.35, margin: 0 }}>
                      {eventState?.current_item_name
                        ? renderMultiLineText(eventState.current_item_name)
                        : (alreadySoldItem?.item_name ? renderMultiLineText(alreadySoldItem.item_name) : 'No question text set')}
                    </h2>
                  ) : (
                    <div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#64748b', lineHeight: 1.35, margin: 0, fontStyle: 'italic' }}>
                        Awaiting Next Question...
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.35rem', margin: '0.35rem 0 0 0' }}>
                        Question text is locked and will be revealed when the timer starts.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Middle Row: CURRENT BID & PREVIOUS BIDS (conditionally rendered) */}
              {showBidRow && (
                <div
                  className="gcl-live-bid-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: hasCurrentBid && hasPreviousBids ? 'repeat(2, 1fr)' : '1fr',
                    gap: '1.25rem',
                  }}
                >
                  {/* Current Bid Card */}
                  {hasCurrentBid && (
                    <div
                      style={{
                        background: '#0c0d12',
                        border: isBiddingActive
                          ? '1.5px solid rgba(224, 38, 63, 0.75)'
                          : '1.5px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: isBiddingActive
                          ? '0 0 25px rgba(224, 38, 63, 0.22), inset 0 0 15px rgba(224, 38, 63, 0.05)'
                          : 'none',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Red corner ambient glow */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '120px',
                          height: '120px',
                          background: 'radial-gradient(circle at top left, rgba(224, 38, 63, 0.28) 0%, transparent 70%)',
                          pointerEvents: 'none',
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isBiddingActive ? '#e0263f' : '#ef4444',
                            boxShadow: isBiddingActive ? '0 0 8px #e0263f' : 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e2e8f0' }}>
                          {isQuestionSold && !isBiddingActive ? 'WINNING BID (SOLD)' : 'CURRENT BID'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', position: 'relative', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: 'rgba(224, 38, 63, 0.15)',
                              border: '1px solid rgba(224, 38, 63, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#e0263f',
                              boxShadow: '0 0 10px rgba(224, 38, 63, 0.2)',
                              flexShrink: 0,
                            }}
                          >
                            <Hammer size={22} className="-rotate-45" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.62rem', color: '#8e8e99', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: 0, lineHeight: 1 }}>
                              {isQuestionSold && !isBiddingActive ? 'WINNING TEAM' : 'BIDDING TEAM'}
                            </p>
                            <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', margin: '0.35rem 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isBiddingActive
                                ? (activeBidTeam?.name || 'Active Team')
                                : (soldBuyerTeam?.name || 'Unknown Team')}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '0.62rem', color: '#8e8e99', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: 0, lineHeight: 1 }}>
                            {isBiddingActive
                              ? 'CURRENT AMOUNT'
                              : 'FINAL PRICE'}
                          </p>
                          <p
                            style={{
                              fontSize: '1.85rem',
                              fontWeight: 900,
                              color: '#e0263f',
                              fontFamily: "'JetBrains Mono', monospace",
                              margin: '0.35rem 0 0 0',
                              lineHeight: 1,
                              textShadow: '0 0 15px rgba(224, 38, 63, 0.4)',
                            }}
                          >
                            {isBiddingActive
                              ? formatCurrency(currentBidPreview?.amount || 0)
                              : formatCurrency(alreadySoldItem?.cost || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Previous Bids Card */}
                  {hasPreviousBids && (
                    <div
                      style={{
                        background: '#0c0d12',
                        border: '1px solid #1e1f29',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', position: 'relative', zIndex: 10 }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#94a3b8',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e2e8f0' }}>
                          PREVIOUS BIDS
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', position: 'relative', zIndex: 10 }}>
                        {previousBidsList.map((bid) => (
                          <div
                            key={bid.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.2rem 0',
                              fontSize: '0.82rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, paddingRight: '0.5rem' }}>
                              <span
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '5px',
                                  background: '#161720',
                                  border: '1px solid #232430',
                                  color: '#94a3b8',
                                  fontSize: '0.7rem',
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {bid.index}
                              </span>
                              <span style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bid.teamName}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                              <span style={{ fontWeight: 800, color: '#e0263f', fontSize: '0.85rem' }}>
                                {bid.amount}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {bid.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Live Team Status Table */}
              <LiveTeamStatus
                teams={teams}
                myTeamId={myTeamId}
                items={items}
              />
            </div>

            {/* RIGHT COLUMN: ~24.4% - Selected Team Panel (ONLY RENDERED WHEN OPEN & SELECTED) */}
            {isTeamPanelOpen && selectedTeam && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minWidth: 0 }}>
                {/* Card 1: SELECTED TEAM */}
                <div
                  style={{
                    background: '#0c0d12',
                    border: '1.5px solid rgba(224, 38, 63, 0.75)',
                    boxShadow: '0 0 28px rgba(224, 38, 63, 0.25), inset 0 0 15px rgba(224, 38, 63, 0.04)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    position: 'relative',
                  }}
                >
                  {/* Header row: Label + Change dropdown + Close [ × ] button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e2e8f0' }}>
                      SELECTED TEAM
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {!isTeamLeader && (
                        <div style={{ position: 'relative' }}>
                          <select
                            value={myTeamId}
                            onChange={(e) => handleSelectTeam(e.target.value)}
                            style={{
                              background: '#1a1b24',
                              border: '1px solid #2a2b36',
                              color: '#94a3b8',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.3rem 1.6rem 0.3rem 0.6rem',
                              borderRadius: '6px',
                              appearance: 'none',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="">Change</option>
                            {sortedTeamsDropdown.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={11} style={{ position: 'absolute', right: '0.45rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCloseTeamPanel}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#94a3b8',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.background = 'rgba(224, 38, 63, 0.25)';
                          e.currentTarget.style.borderColor = '#e0263f';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        title="Close Panel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                {/* Team Identity: Roaring Lion Shield Crest + Name + Leader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingBottom: '1rem', borderBottom: '1px solid #1c1d25', position: 'relative', zIndex: 10 }}>
                  {/* Detailed Roaring Lion Shield Crest */}
                  <div style={{ width: '68px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 12px rgba(224, 38, 63, 0.65))' }}>
                      <defs>
                        <linearGradient id="crestShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2c050d" />
                          <stop offset="50%" stopColor="#140205" />
                          <stop offset="100%" stopColor="#080102" />
                        </linearGradient>
                        <linearGradient id="crestShieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff4d66" />
                          <stop offset="45%" stopColor="#e0263f" />
                          <stop offset="100%" stopColor="#6e0b17" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M50 4 L92 18 C92 72 50 114 50 116 C50 114 8 72 8 18 Z"
                        fill="url(#crestShieldBg)"
                        stroke="url(#crestShieldBorder)"
                        strokeWidth="3.2"
                      />
                      <path
                        d="M50 11 L84 23 C84 66 50 102 50 104 C50 102 16 66 16 23 Z"
                        fill="none"
                        stroke="#e0263f"
                        strokeWidth="1.2"
                        opacity="0.5"
                      />
                      <g transform="translate(18, 24) scale(0.64)">
                        <path d="M50 2 C62 4 72 2 78 10 C84 18 86 28 90 38 C94 48 88 58 86 66 C82 76 74 84 66 90 C56 94 50 96 46 96 C40 96 34 94 26 90 C18 84 10 76 6 66 C4 58 -2 48 2 38 C6 28 8 18 14 10 C20 2 30 5 50 2 Z" fill="#1c0307" />
                        <path d="M50 4 L56 16 L66 10 L68 22 L80 18 L76 30 L88 32 L80 42 L90 48 L78 56 L86 64 L74 68 L78 80 L66 78 L62 90 L50 82 L38 90 L34 78 L22 80 L26 68 L14 64 L22 56 L10 48 L20 42 L12 32 L24 30 L20 18 L32 22 L34 10 L44 16 Z" fill="#edf0f7" />
                        <path d="M50 22 C36 22 28 32 28 48 C28 66 40 76 50 76 C60 76 72 66 72 48 C72 32 64 22 50 22 Z" fill="#100204" />
                        <path d="M38 30 L50 36 L62 30 L58 38 L50 40 L42 38 Z" fill="#edf0f7" />
                        <polygon points="36,44 44,46 38,50" fill="#ff2e4d" />
                        <polygon points="64,44 56,46 62,50" fill="#ff2e4d" />
                        <polygon points="50,54 44,60 56,60" fill="#edf0f7" />
                        <path d="M42 62 Q50 66 58 62 L56 72 Q50 75 44 72 Z" fill="#050001" />
                        <polygon points="44,62 46,67 48,62" fill="#ffffff" />
                        <polygon points="56,62 54,67 52,62" fill="#ffffff" />
                        <polygon points="46,72 48,67 50,72" fill="#ffffff" />
                        <polygon points="54,72 52,67 50,72" fill="#ffffff" />
                      </g>
                    </svg>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedTeam?.name || 'Selected Team'}
                      </h3>
                      <span
                        style={{
                          background: '#e0263f',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '0.12rem 0.4rem',
                          borderRadius: '4px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        YOU
                      </span>
                    </div>
                    <p style={{ fontSize: '0.62rem', color: '#8e8e99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.25rem 0 0 0', lineHeight: 1 }}>
                      Leader
                    </p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', margin: '0.15rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedTeamLeader || 'No Leader Assigned'}
                    </p>
                  </div>
                </div>

                {/* Team Members List */}
                <div style={{ marginTop: '0.85rem', position: 'relative', zIndex: 10 }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.45rem', margin: '0 0 0.45rem 0' }}>
                    Team Members ({selectedTeamMembers.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {selectedTeamMembers.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.35rem 0' }}>
                        No members registered
                      </div>
                    ) : (
                      selectedTeamMembers.map((member, i) => (
                        <div
                          key={member.id || i}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: '#cbd5e1' }}
                        >
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              background: '#15161f',
                              border: '1px solid #232430',
                              color: '#94a3b8',
                              fontSize: '0.7rem',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.name || (member as any).full_name || `Member ${i + 1}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dual Stats Row: Total Spent & Remaining */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #1c1d25', position: 'relative', zIndex: 10 }}>
                  {/* Total Spent */}
                  <div
                    style={{
                      background: '#111218',
                      border: '1px solid #22232c',
                      borderRadius: '12px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.45rem',
                        borderRadius: '8px',
                        background: 'rgba(224, 38, 63, 0.15)',
                        border: '1px solid rgba(224, 38, 63, 0.35)',
                        color: '#e0263f',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Coins size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.62rem', color: '#8e8e99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, lineHeight: 1 }}>
                        Total Spent
                      </p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 900, color: '#e0263f', fontFamily: "'JetBrains Mono', monospace", margin: '0.2rem 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(selectedTeamSpent)}
                      </p>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div
                    style={{
                      background: '#111218',
                      border: '1px solid #22232c',
                      borderRadius: '12px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.45rem',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#10b981',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Wallet size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.62rem', color: '#8e8e99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, lineHeight: 1 }}>
                        Remaining
                      </p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981', fontFamily: "'JetBrains Mono', monospace", margin: '0.2rem 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(selectedTeam?.budget || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Items Won */}
              <div
                style={{
                  background: '#0c0d12',
                  border: '1px solid #1e1f29',
                  borderRadius: '16px',
                  padding: '1.15rem 1.4rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Package size={15} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#e2e8f0' }}>
                    Items Won ({selectedTeamWonItems.length})
                  </span>
                </div>

                {selectedTeamWonItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', textAlign: 'center' }}>
                    <Box size={34} style={{ color: '#475569', marginBottom: '0.5rem', strokeWidth: 1.5 }} />
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, margin: 0 }}>
                      No items won yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '14rem', overflowY: 'auto' }}>
                    {selectedTeamWonItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: '#14151b',
                          border: '1px solid #22232a',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>
                          {item.item_name || item.question_ref}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#f87171', flexShrink: 0 }}>
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* 3b. ROUND 1 LEADERBOARD REVEAL STATE (Sequential Manual Reveal, Scores Strictly Excluded) */}
      {(gameState === 'leaderboard_reveal' ||
        eventState?.round_state === 'LEADERBOARD_REVEAL' ||
        eventState?.round_state === 'LEADERBOARD_HIDDEN') && (
        <div className="live-page-container">
          <div className="text-center mb-8">
            <div className="inline-block mb-3">
              <span className="badge-official">ROUND 1 OFFICIAL STANDINGS</span>
            </div>
            <h1 className="champions-title">LEADERBOARD REVEAL</h1>
            <p
              className="text-base sm:text-lg text-slate-400 font-mono uppercase tracking-widest gcl-display"
              style={{ letterSpacing: '0.2em' }}
            >
              ROUND 1 FINAL POSITIONS (REVEALING FROM BOTTOM TO TOP)
            </p>
          </div>          <div className="max-w-4xl w-full mx-auto px-2">
            <div className="gcl-table-card">
              <div className="gcl-leaderboard-header-reveal">
                <div>POS</div>
                <div>TEAM NAME</div>
                <div className="text-right">STATUS</div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const r1Snapshot = pastRounds.find((r) => r.roundIndex === 0);
                  const totalCount = Math.max(
                    teams.length,
                    effectiveReveals.length,
                    r1Snapshot?.results?.length || 0
                  );

                  return Array.from({ length: totalCount }, (_, i) => {
                    const position = i + 1;
                    const reveal = effectiveReveals.find((r) => r.position === position);
                    const isRevealed = Boolean(reveal?.is_revealed);
                    const r1Result = r1Snapshot?.results?.[position - 1] || r1Snapshot?.results?.find((r) => r.id === reveal?.team_id);
                    const teamObj = teams.find((t) => t.id === reveal?.team_id) || (r1Result?.id ? teams.find((t) => t.id === r1Result.id) : undefined);

                    // Robust fallback for team name: never blank during reveal time
                    const teamDisplayName =
                      reveal?.team_name ||
                      teamObj?.name ||
                      r1Result?.name ||
                      (isRevealed ? `Team ${position}` : '???');

                    const isMyTeam = isRevealed && (reveal?.team_id === myTeamId || teamObj?.id === myTeamId || r1Result?.id === myTeamId);

                    if (!isRevealed) {
                      return (
                        <div
                          key={position}
                          className="gcl-leaderboard-row-reveal gcl-leaderboard-unrevealed"
                        >
                          <div className="flex items-center">
                            <div className="gcl-pos-badge gcl-pos-muted opacity-60">
                              ?
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm sm:text-base font-bold text-slate-500 tracking-widest flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                              AWAITING REVEAL
                            </span>
                          </div>
                          <div className="text-right font-mono text-xs uppercase tracking-wider text-slate-600">
                            LOCKED
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={position}
                        className={`gcl-leaderboard-row-reveal animate-reveal-up ${
                          position === 1
                            ? 'gcl-leaderboard-champion'
                            : position === 2
                            ? 'gcl-leaderboard-runnerup'
                            : position === 3
                            ? 'gcl-leaderboard-third'
                            : isMyTeam
                            ? 'gcl-leaderboard-me'
                            : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`gcl-pos-badge ${
                              position === 1
                                ? 'gcl-pos-gold'
                                : position === 2
                                ? 'gcl-pos-silver'
                                : position === 3
                                ? 'gcl-pos-bronze'
                                : isMyTeam
                                ? 'gcl-pos-cyan'
                                : 'gcl-pos-muted'
                            }`}
                          >
                            {String(position).padStart(2, '0')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {position === 1 && (
                            <Crown size={22} className="text-yellow-400 shrink-0 animate-bounce" />
                          )}
                          {position === 2 && (
                            <Medal size={20} className="text-slate-300 shrink-0" />
                          )}
                          {position === 3 && (
                            <Medal size={20} className="text-orange-400 shrink-0" />
                          )}
                          <span className="font-extrabold text-white text-base sm:text-lg tracking-wide truncate">
                            {teamDisplayName}
                          </span>
                          {isMyTeam && <span className="badge-you-inline">YOU</span>}
                        </div>

                        <div className="text-right font-mono text-xs uppercase tracking-wider">
                          {position === 1 ? (
                            <span className="text-yellow-400 font-bold">1ST PLACE</span>
                          ) : position === 2 ? (
                            <span className="text-slate-300 font-bold">2ND PLACE</span>
                          ) : position === 3 ? (
                            <span className="text-orange-400 font-bold">3RD PLACE</span>
                          ) : (
                            <span className="text-slate-400">REVEALED</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="live-centered-screen">
          {roundIdx === 1 ? (
            /* ROUND 2 INTERMISSION — COMPLETED STANDINGS & BUDGET CARRYOVER NOTICE */
            <div className="max-w-5xl w-full mx-auto px-4 space-y-6">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 2 COMPLETE</span>
                </div>
                <h1 className="intermission-title">INTERMISSION</h1>
                <p className="intermission-subtitle">ROUND 3 WILL START SOON — STAND BY...</p>
                <div className="intermission-warning-banner mt-4">
                  💰 BUDGET CARRYOVER NOTICE: ROUND 2 REMAINING BUDGET CARRIES OVER INTO ROUND 3 💰
                </div>
              </div>

              <div className="gcl-table-card">
                <div className="px-4 py-2.5 bg-[#18181c] border-b border-[#26262b] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>PREVIOUS ROUND TABLE (ROUND 2 RESULTS)</span>
                  </div>
                  <span className="text-slate-400">ROUND 2 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header">
                  <div>#</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="space-y-2">
                  {[...teams]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                    .map((team, idx) => {
                      const isMyTeam = team.id === myTeamId;
                      const teamItems = items.filter((it) => it.team_id === team.id && it.round_index === 1);
                      const totalItems = teamItems.length;
                      const totalSpent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
                      const startingBudget = edition?.starting_budget || 50000000;
                      const r2Remaining = Math.max(0, startingBudget - totalSpent);
                      const r3Budget = startingBudget + r2Remaining;
                      const displayRemaining = team.budget > startingBudget ? team.budget : (eventState?.round_state === 'NEXT_ROUND_READY' ? r3Budget : team.budget);

                      return (
                        <div
                          key={team.id}
                          className={`gcl-leaderboard-row ${isMyTeam ? 'gcl-leaderboard-me' : ''}`}
                        >
                          <div className="flex items-center">
                            <div className="gcl-pos-badge gcl-pos-cyan text-sm">
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="font-extrabold text-white text-base sm:text-lg tracking-wide truncate">
                              {team.name}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>
                          <div className="text-center">
                            <span className="badge-items-sm font-mono">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="text-right font-mono font-semibold text-red-400 text-sm sm:text-base">
                            {formatCurrency(totalSpent)}
                          </div>
                          <div className="text-right font-mono font-bold text-green-400 text-sm sm:text-base">
                            {formatCurrency(displayRemaining)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : roundIdx === 0 ? (
            /* ROUND 1 INTERMISSION — COMPLETED STANDINGS & BUDGET RESET NOTICE */
            <div className="max-w-5xl w-full mx-auto px-4 space-y-6">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 1 COMPLETE</span>
                </div>
                <h1 className="intermission-title">INTERMISSION</h1>
                <p className="intermission-subtitle">ROUND 2 WILL START SOON — STAND BY...</p>
                <div className="intermission-warning-banner mt-4">
                  ⚠️ BUDGET RESET NOTICE: ALL TEAMS RESET TO STARTING BUDGET FOR ROUND 2 ⚠️
                </div>
              </div>

              <div className="gcl-table-card">
                <div className="px-4 py-2.5 bg-[#18181c] border-b border-[#26262b] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>PREVIOUS ROUND TABLE (ROUND 1 RESULTS)</span>
                  </div>
                  <span className="text-slate-400">ROUND 1 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header">
                  <div>POS</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const r1Snapshot = pastRounds.find((r) => r.roundIndex === 0);
                    const sourceList = (r1Snapshot?.results && r1Snapshot.results.length > 0)
                      ? r1Snapshot.results
                      : teams;

                    return sourceList.map((entry: any, i: number) => {
                      const position = i + 1;
                      const teamObj = teams.find((t) => t.id === entry.id) || entry;
                      const teamName = entry.name || teamObj?.name || `Team ${position}`;
                      const isMyTeam = (entry.id || teamObj?.id) === myTeamId;
                      const teamItems = items.filter((it) => it.team_id === (entry.id || teamObj?.id) && it.round_index === 0);
                      const itemsCount = entry.itemsCount ?? teamItems.length;
                      const totalSpent = entry.totalSpent ?? teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
                      const remaining = entry.remainingBudget ?? (teamObj?.budget ?? Math.max(0, (edition?.starting_budget || 50000000) - totalSpent));

                      return (
                        <div
                          key={entry.id || position}
                          className={`gcl-leaderboard-row ${
                            position === 1
                              ? 'gcl-leaderboard-champion'
                              : position === 2
                              ? 'gcl-leaderboard-runnerup'
                              : position === 3
                              ? 'gcl-leaderboard-third'
                              : isMyTeam
                              ? 'gcl-leaderboard-me'
                              : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <div
                              className={`gcl-pos-badge ${
                                position === 1
                                  ? 'gcl-pos-gold'
                                  : position === 2
                                  ? 'gcl-pos-silver'
                                  : position === 3
                                  ? 'gcl-pos-bronze'
                                  : isMyTeam
                                  ? 'gcl-pos-cyan'
                                  : 'gcl-pos-muted'
                              }`}
                            >
                              {String(position).padStart(2, '0')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {position === 1 && (
                              <Crown size={22} className="text-yellow-400 shrink-0" />
                            )}
                            {position === 2 && (
                              <Medal size={20} className="text-slate-300 shrink-0" />
                            )}
                            {position === 3 && (
                              <Medal size={20} className="text-orange-400 shrink-0" />
                            )}
                            <span className="font-extrabold text-white text-base sm:text-lg tracking-wide truncate">
                              {teamName}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>

                          <div className="text-center">
                            <span className="badge-items-sm font-mono">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div className="text-right font-mono font-semibold text-red-400 text-sm sm:text-base">
                            {formatCurrency(totalSpent)}
                          </div>

                          <div className="text-right font-mono font-bold text-green-400 text-sm sm:text-base">
                            {formatCurrency(remaining)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* AFTER ROUND 3 OR TIE BREAKER INTERMISSION */
            <div className="max-w-5xl w-full mx-auto px-4 space-y-6">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 3 COMPLETE</span>
                </div>
                <h1 className="intermission-title">
                  {isAfterRound3 ? 'RESULTS WILL BE ANNOUNCED SOON' : 'NEXT ROUND WILL START SOON'}
                </h1>
                <p className="intermission-subtitle">STAND BY...</p>
              </div>

              <div className="gcl-table-card">
                <div className="px-4 py-2.5 bg-[#18181c] border-b border-[#26262b] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>PREVIOUS ROUND TABLE (ROUND 3 RESULTS)</span>
                  </div>
                  <span className="text-slate-400">ROUND 3 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header">
                  <div>#</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="space-y-2">
                  {[...teams]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                    .map((team, idx) => {
                      const isMyTeam = team.id === myTeamId;
                      const teamItems = items.filter((it) => it.team_id === team.id && it.round_index === 2);
                      const totalItems = teamItems.length;
                      const totalSpent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
                      return (
                        <div
                          key={team.id}
                          className={`gcl-leaderboard-row ${isMyTeam ? 'gcl-leaderboard-me' : ''}`}
                        >
                          <div className="flex items-center">
                            <div className="gcl-pos-badge gcl-pos-cyan text-sm">
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="font-extrabold text-white text-base sm:text-lg tracking-wide truncate">
                              {team.name}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>
                          <div className="text-center">
                            <span className="badge-items-sm font-mono">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="text-right font-mono font-semibold text-red-400 text-sm sm:text-base">
                            {formatCurrency(totalSpent)}
                          </div>
                          <div className="text-right font-mono font-bold text-green-400 text-sm sm:text-base">
                            {formatCurrency(team.budget)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. WINNER REVEAL STATE (Sequential Manual Reveal Podium matching Old GCL reference) */}
      {gameState === 'winner_reveal' && (
        <div className="live-page-container">
          <div className="text-center mb-12">
            <h1 className="champions-title">CHAMPIONS</h1>
            <p className="text-xl text-slate-400 font-mono uppercase tracking-widest gcl-display" style={{ letterSpacing: '0.2em' }}>
              Grand Final Standings
            </p>
          </div>

          {/* Grand Champions Podium */}
          {(() => {
            const firstTeam = teams.find((t) => t.id === podiumState.firstTeamId);
            const firstName = firstTeam?.name || (podiumState as any)?.firstTeamName || (podiumState.firstTeamId ? 'Champion' : '');

            const secondTeam = teams.find((t) => t.id === podiumState.secondTeamId);
            const secondName = secondTeam?.name || (podiumState as any)?.secondTeamName || (podiumState.secondTeamId ? 'Runner-Up' : '');

            const thirdTeam = teams.find((t) => t.id === podiumState.thirdTeamId);
            const thirdName = thirdTeam?.name || (podiumState as any)?.thirdTeamName || (podiumState.thirdTeamId ? '3rd Place' : '');

            return (
              <div className="podium-wrapper">
                {/* 2nd Place Pedestal (Left) */}
                <div className="podium-col order-2 md:order-1">
                  <div className="podium-badge mb-4">
                    {podiumState.secondRevealed && (secondTeam || secondName) ? (
                      <div className="animate-reveal-up">
                        <Medal size={56} className="text-slate-300 mx-auto mb-2" />
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">{secondName}</h2>
                      </div>
                    ) : (
                      <div>
                        <div className="podium-hidden-circle">?</div>
                        <p className="podium-hidden-label">HIDDEN</p>
                      </div>
                    )}
                  </div>
                  <div className={`podium-step ${podiumState.secondRevealed ? 'podium-silver' : 'podium-dark'}`}>
                    <span className="podium-number">2</span>
                  </div>
                </div>

                {/* 1st Place Champion Pedestal (Middle) */}
                <div className="podium-col order-1 md:order-2 scale-105 z-20">
                  <div className="podium-badge mb-6">
                    {podiumState.firstRevealed && (firstTeam || firstName) ? (
                      <div className="animate-reveal-up">
                        <Crown size={72} className="text-yellow-400 mx-auto mb-2 animate-bounce" />
                        <h2 className="text-3xl md:text-4xl font-black text-yellow-300">{firstName}</h2>
                      </div>
                    ) : (
                      <div>
                        <div className="podium-hidden-circle">?</div>
                        <p className="podium-hidden-label">HIDDEN</p>
                      </div>
                    )}
                  </div>
                  <div className={`podium-step ${podiumState.firstRevealed ? 'podium-gold' : 'podium-dark'}`}>
                    <span className="podium-number">1</span>
                  </div>
                </div>

                {/* 3rd Place Pedestal (Right) */}
                <div className="podium-col order-3 md:order-3">
                  <div className="podium-badge mb-4">
                    {podiumState.thirdRevealed && (thirdTeam || thirdName) ? (
                      <div className="animate-reveal-up">
                        <Medal size={56} className="text-orange-400 mx-auto mb-2" />
                        <h2 className="text-2xl md:text-3xl font-extrabold text-orange-200">{thirdName}</h2>
                      </div>
                    ) : (
                      <div>
                        <div className="podium-hidden-circle">?</div>
                        <p className="podium-hidden-label">HIDDEN</p>
                      </div>
                    )}
                  </div>
                  <div className={`podium-step ${podiumState.thirdRevealed ? 'podium-bronze' : 'podium-dark'}`}>
                    <span className="podium-number">3</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Grand Champion Final Standings (All Rounds Combined - Scores Strictly Hidden) */}
          <div className="max-w-5xl w-full mx-auto mt-12 px-2">
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <Crown size={28} className="text-yellow-400 shrink-0" />
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide text-center">
                Final Championship Standings
              </h2>
            </div>
            <div className="gcl-table-container">
              {/* Header row - Strictly no scores in Live View */}
              <div className="grid-live-final-header">
                <div>TEAM NAME</div>
                <div className="text-center">ITEMS WON</div>
                <div className="text-right">TOTAL SPENT</div>
                <div className="text-right">TOTAL REM.</div>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {overallStats.map((team) => {
                  const isGrandChampion =
                    ((team.id === podiumState.firstTeamId || team.name === (podiumState as any)?.firstTeamName) &&
                    podiumState.firstRevealed);
                  const isRunnerUp =
                    ((team.id === podiumState.secondTeamId || team.name === (podiumState as any)?.secondTeamName) &&
                    podiumState.secondRevealed);
                  const isThirdPlace =
                    ((team.id === podiumState.thirdTeamId || team.name === (podiumState as any)?.thirdTeamName) &&
                    podiumState.thirdRevealed);
                  const isOutOfBudget = team.totalRemaining <= 0;
                  const isMyTeam = team.id === myTeamId;

                  return (
                    <div
                      key={team.id}
                      className={`grid-live-final-row ${
                        isGrandChampion
                          ? 'gcl-row-champion'
                          : isRunnerUp
                          ? 'gcl-row-runnerup'
                          : isThirdPlace
                          ? 'gcl-row-third'
                          : isMyTeam
                          ? 'grid-live-status-me'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isGrandChampion && (
                          <Crown size={20} className="text-yellow-400 shrink-0 animate-bounce" />
                        )}
                        {isRunnerUp && (
                          <Medal size={20} className="text-slate-300 shrink-0 animate-pulse" />
                        )}
                        {isThirdPlace && (
                          <Award size={20} className="text-amber-500 shrink-0 animate-pulse" />
                        )}
                        <span className="font-bold text-white text-base md:text-lg truncate">
                          {team.name}
                        </span>
                        {isMyTeam && <span className="badge-you-inline">YOU</span>}
                        {isOutOfBudget && (
                          <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                        )}
                        {isGrandChampion && (
                          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-yellow-500/20 border border-yellow-500/40 px-2 py-0.5 rounded-full ml-1">
                            GRAND CHAMPION
                          </span>
                        )}
                        {isRunnerUp && (
                          <span className="text-[10px] font-black tracking-widest text-slate-200 uppercase bg-slate-400/20 border border-slate-300/40 px-2 py-0.5 rounded-full ml-1">
                            RUNNER-UP
                          </span>
                        )}
                        {isThirdPlace && (
                          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-600/20 border border-amber-600/40 px-2 py-0.5 rounded-full ml-1">
                            3RD PLACE
                          </span>
                        )}
                      </div>

                      <div className="text-center font-mono">
                        <span className="badge-items-sm">
                          {team.totalItems} {team.totalItems === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="text-right font-mono font-semibold text-red-400 text-base md:text-lg">
                        {formatCurrency(team.totalSpent)}
                      </div>

                      <div className="text-right font-mono font-black text-green-400 text-lg md:text-xl">
                        {formatCurrency(team.totalRemaining)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
