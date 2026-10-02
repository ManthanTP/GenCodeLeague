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
  History,
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
    timeLeft,
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

  // Reset scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  // Available teams from Supabase with fallback to blueprint teams
  const availableTeams = useMemo(() => {
    if (teams && teams.length > 0) return teams;
    return [
      { id: 't1', name: 'helloo new team', budget: 50000000, score: 0, edition_id: '' },
      { id: 't2', name: 'New team 1', budget: 49000000, score: 0, edition_id: '' },
      { id: 't3', name: 'New team 2', budget: 45000000, score: 0, edition_id: '' },
      { id: 't4', name: 'New team 3', budget: 43000000, score: 0, edition_id: '' },
      { id: 't5', name: 'New team 4', budget: 50000000, score: 0, edition_id: '' },
      { id: 't6', name: 'New team 5', budget: 50000000, score: 0, edition_id: '' },
      { id: 't7', name: 'Team Alpha', budget: 47000000, score: 0, edition_id: '' },
      { id: 't8', name: 'New team 6', budget: 50000000, score: 0, edition_id: '' },
    ] as Team[];
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

  // Selected Team for Right Sidebar - Always available on desktop to match reference layout
  const selectedTeam = useMemo(() => {
    if (!availableTeams || availableTeams.length === 0) return null;
    if (myTeamId) {
      return availableTeams.find((t) => t.id === myTeamId) || availableTeams[0];
    }
    return availableTeams[0];
  }, [availableTeams, myTeamId]);

  const effectiveMyTeamId = myTeamId || (availableTeams.length > 0 ? availableTeams[0].id : '');

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return teamMembersMap[selectedTeam.id] || [];
  }, [selectedTeam, teamMembersMap]);

  const displayMembers = useMemo(() => {
    if (!selectedTeam) return [];
    const fromDb = teamMembersMap[selectedTeam.id] || [];
    const list = [...fromDb];
    for (let i = list.length; i < 5; i++) {
      list.push({
        id: `pad_${i + 1}`,
        name: `Member ${i + 1}`,
        is_captain: false,
        team_id: selectedTeam.id,
        usn: null,
        email: null,
        phone: null,
        created_at: '',
      });
    }
    return list.slice(0, 5);
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamLeader = useMemo(() => {
    if (!selectedTeam) return 'Manthan Patel';
    const members = teamMembersMap[selectedTeam.id] || [];
    const captain = members.find((m) => m.is_captain);
    return captain?.name || (captain as any)?.full_name || members[0]?.name || (members[0] as any)?.full_name || (selectedTeam as any).leader_name || 'Manthan Patel';
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
    setIsTeamPanelOpen(true);
  };

  const handleCloseTeamPanel = () => {
    setIsTeamPanelOpen(false);
    if (!isTeamLeader) {
      setMyTeamId('');
    }
  };

  const previousBidsList = useMemo(() => {
    const fallbacks = [
      { id: 'fb1', index: 1, teamName: 'New team 2', amount: '₹50.00 L', time: '14:28:10' },
      { id: 'fb2', index: 2, teamName: 'Team Alpha', amount: '₹30.00 L', time: '14:27:42' },
      { id: 'fb3', index: 3, teamName: 'New team 1', amount: '₹10.00 L', time: '14:26:15' },
    ];

    if (!items || items.length === 0) {
      return fallbacks;
    }

    const realList = items.slice(0, 3).map((item, idx) => {
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

    while (realList.length < 3) {
      const fb = fallbacks[realList.length];
      realList.push({ ...fb, index: realList.length + 1 });
    }
    return realList;
  }, [items, teams]);

  const gameState = eventState?.game_state || 'active';
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
  // Always true on desktop so Current Bid and Previous Bids remain side-by-side matching reference
  const hasCurrentBid = true;
  const hasPreviousBids = true;
  const showBidRow = true;

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
      className={`min-h-screen text-white font-sans gcl-live-page gcl-page-enter ${isFullscreen ? 'gcl-fullscreen-active' : ''}`}
      style={{
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
        totalAvailable={totalAvailable || 342000000}
        teamCount={availableTeams.length}
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

      {/* 3. ACTIVE ROUND STATE (EXACT MATCH TO BLUEPRINT) */}
      {gameState === 'active' && (
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 28px 24px 28px' }}>
          {/* Top Right Controls: Viewing as Guest Dropdown (270px x 35px) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '10px' }}>
            {!isTeamLeader && (
              <div style={{ position: 'relative', width: '270px' }}>
                <select
                  value={myTeamId}
                  onChange={(e) => handleSelectTeam(e.target.value)}
                  className="panel"
                  style={{
                    width: '100%',
                    height: '35px',
                    borderRadius: '8px',
                    background: '#18181c',
                    border: '1px solid #2c2c33',
                    color: '#d6d6dc',
                    fontSize: '15px',
                    padding: '0 32px 0 14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <option value="">Viewing as Guest (Select Team)</option>
                  {sortedTeamsDropdown.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9a9aa3', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

          {/* Main Arena 2-Column Grid (Left 1156px, Right 369px, Gap 26px) */}
          <div className="gcl-live-arena-grid">
            {/* LEFT COLUMN: 1156px (Question box, Bids row, Live Team Status) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '21px', width: '100%', minWidth: 0 }}>
              {/* 1. Question / Item Box with 3-Piece Red Diagonal Laser Strips (1156px x 158px) */}
              <div
                className="panel red"
                style={{
                  minHeight: '158px',
                  height: '158px',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* 3 Strips with exact blueprint clip-path */}
                <div
                  className="strip"
                  style={{
                    clipPath: 'polygon(46px 0, 100px 0, 0 100px, 0 46px)',
                    background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 1px,rgba(0,0,0,.14) 1px 3px),linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.03))',
                  }}
                />
                <div
                  className="strip"
                  style={{
                    clipPath: 'polygon(42px 0, 46px 0, 0 46px, 0 42px)',
                    background: '#ff2a38',
                    filter: 'drop-shadow(0 0 4px rgba(232,33,46,.8))',
                  }}
                />
                <div
                  className="strip"
                  style={{
                    clipPath: 'polygon(99px 0, 101px 0, 0 101px, 0 99px)',
                    background: 'rgba(255,255,255,.18)',
                  }}
                />

                {/* Left content: round meta + question text */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1, minWidth: 0, paddingLeft: '8px', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#e6e6ea', letterSpacing: '0.3px', fontFamily: "'Inter', sans-serif" }}>
                        {currentRound.name.toUpperCase()}
                      </span>
                      <div style={{ width: '64px', height: '2px', background: '#e8212e' }} />
                    </div>
                    <div style={{ width: '1px', height: '20px', background: '#3a3a41' }} />
                    <span style={{ fontSize: '16px', letterSpacing: '0.3px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                      QUESTION {questionIdx + 1} OF {totalQuestions}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: '31px',
                      fontWeight: 700,
                      color: '#f4f4f6',
                      lineHeight: 1.15,
                      margin: 0,
                      fontFamily: "'Rajdhani', sans-serif",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {eventState?.current_item_name
                      ? renderMultiLineText(eventState.current_item_name)
                      : (alreadySoldItem?.item_name
                          ? renderMultiLineText(alreadySoldItem.item_name)
                          : `Q${questionIdx + 1}: What is the output of console.log(typeof NaN)?`)}
                  </h2>
                </div>

                {/* Right: BID TIMER (188px x 120px) */}
                <div
                  className="panel"
                  style={{
                    width: '188px',
                    height: '120px',
                    borderRadius: '12px',
                    background: '#17171b',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={22} style={{ color: '#e8212e' }} />
                    <span style={{ fontSize: '19px', fontWeight: 600, color: '#c8c8ce', fontFamily: "'Rajdhani', sans-serif" }}>
                      BID TIMER
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '46px',
                      fontWeight: 700,
                      fontFamily: "'Rajdhani', sans-serif",
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                      marginTop: '4px',
                      color: '#f4f4f6',
                    }}
                  >
                    {isTimerRunning && timeLeft > 0 ? timerFormatted : '02:48'}
                  </div>
                  <div style={{ width: '161px', height: '7px', borderRadius: '4px', background: '#26262c', marginTop: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '7px',
                        borderRadius: '4px',
                        background: '#e8212e',
                        width: (isTimerRunning && timeLeft > 0 && eventState?.timer_duration_seconds)
                          ? `${Math.max(0, Math.min(100, (timeLeft / eventState.timer_duration_seconds) * 100))}%`
                          : '45%',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: CURRENT BID & PREVIOUS BIDS side by side (Height 161px) */}
              {showBidRow && (
                <div className="gcl-live-bid-row">
                  {/* Current Bid Card (581px x 161px) */}
                  {hasCurrentBid && (
                    <div
                      className="panel red"
                      style={{
                        minHeight: '161px',
                        height: '161px',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      {/* Top-right corner strips */}
                      <div
                        className="strip"
                        style={{
                          clipPath: 'polygon(calc(100% - 100px) 0, calc(100% - 46px) 0, 100% 46px, 100% 100px)',
                          background: 'repeating-linear-gradient(45deg,rgba(255,255,255,.06) 0 1px,rgba(0,0,0,.14) 1px 3px),linear-gradient(225deg,rgba(255,255,255,.13),rgba(255,255,255,.03))',
                        }}
                      />
                      <div
                        className="strip"
                        style={{
                          clipPath: 'polygon(calc(100% - 50px) 0, calc(100% - 46px) 0, 100% 46px, 100% 50px)',
                          background: '#ff2a38',
                          filter: 'drop-shadow(0 0 4px rgba(232,33,46,.8))',
                        }}
                      />

                      {/* Header: 19px pulsing red dot + CURRENT BID */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 10 }}>
                        <div className="dot" style={{ width: '19px', height: '19px', borderRadius: '50%', background: '#e8212e' }} />
                        <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.5px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                          {isQuestionSold && !isBiddingActive ? 'WINNING BID (SOLD)' : 'CURRENT BID'}
                        </span>
                      </div>

                      {/* Content row: Gavel Tile, Bidding Team, Divider, Current Amount */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', minWidth: 0 }}>
                          <div
                            className="panel"
                            style={{
                              width: '83px',
                              height: '78px',
                              borderRadius: '10px',
                              background: 'linear-gradient(180deg, #24242a, #18181c)',
                              border: '1px solid #383844',
                              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Hammer size={44} style={{ color: '#e8212e', strokeWidth: 1.8, transform: 'rotate(-45deg)' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                              {isQuestionSold && !isBiddingActive ? 'WINNING TEAM' : 'BIDDING TEAM'}
                            </p>
                            <p style={{ fontSize: '27px', fontWeight: 700, color: '#f4f4f6', margin: '6px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                              {isBiddingActive
                                ? (activeBidTeam?.name || 'Active Team')
                                : (soldBuyerTeam?.name || 'New team 3')}
                            </p>
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div style={{ width: '1px', height: '76px', background: '#2e2e34' }} />

                        <div style={{ minWidth: 0, textAlign: 'left', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                            {isBiddingActive ? 'CURRENT AMOUNT' : (isQuestionSold ? 'FINAL PRICE' : 'CURRENT AMOUNT')}
                          </p>
                          <p
                            style={{
                              fontSize: '44px',
                              fontWeight: 700,
                              color: '#ff3b47',
                              fontFamily: "'Rajdhani', sans-serif",
                              fontVariantNumeric: 'tabular-nums',
                              margin: '6px 0 0 0',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isBiddingActive
                              ? formatCurrency(currentBidPreview?.amount || 0)
                              : (alreadySoldItem?.cost ? formatCurrency(alreadySoldItem.cost) : '₹70.00 L')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Previous Bids Card (557px x 161px) - Grey panel border matching screenshot */}
                  {hasPreviousBids && (
                    <div
                      className="panel"
                      style={{
                        minHeight: '161px',
                        height: '161px',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px', zIndex: 10 }}>
                        <History size={23} style={{ color: '#f4f4f6' }} />
                        <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.5px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                          PREVIOUS BIDS
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', zIndex: 10 }}>
                        {previousBidsList.map((bid) => (
                          <div
                            key={bid.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '36px 1fr auto 75px',
                              alignItems: 'center',
                              gap: '14px',
                              height: '28px',
                              minHeight: '28px',
                              background: '#1c1c21',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              padding: '0 8px 0 0',
                            }}
                          >
                            <div className="num" style={{ width: '36px', height: '28px', borderRadius: '4px', fontSize: '15px' }}>
                              {bid.index}
                            </div>
                            <span style={{ fontSize: '16px', color: '#f4f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>
                              {bid.teamName}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#ff4350', fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                              {bid.amount}
                            </span>
                            <span style={{ fontSize: '16px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                              {bid.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Live Team Status Table (1156px x 385px) */}
              <LiveTeamStatus
                teams={availableTeams}
                myTeamId={effectiveMyTeamId}
                items={items}
              />
            </div>

            {/* RIGHT COLUMN: 369px x 715px SELECTED TEAM & ITEMS WON */}
            <div style={{ width: '100%', minWidth: 0 }}>
              <div
                className="panel red"
                style={{
                  width: '100%',
                  minHeight: '715px',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                {/* Header row: SELECTED TEAM + Change button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                  <span style={{ fontSize: '21px', fontWeight: 700, letterSpacing: '0.3px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                    SELECTED TEAM
                  </span>
                  {!isTeamLeader && (
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '105px',
                          height: '35px',
                          borderRadius: '7px',
                          background: '#25252b',
                          border: '1px solid #34343b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 8px 0 12px',
                        }}
                      >
                        <span style={{ fontSize: '15px', color: '#f4f4f6', fontFamily: "'Inter', sans-serif" }}>Change</span>
                        <div style={{ width: '1px', height: '35px', background: '#34343b' }} />
                        <ChevronDown size={15} style={{ color: '#f4f4f6' }} />
                      </div>
                      <select
                        value={myTeamId}
                        onChange={(e) => handleSelectTeam(e.target.value)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <option value="">Change</option>
                        {sortedTeamsDropdown.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Team Identity Card (340px x 358px, #18181c, border #25252b) */}
                <div
                  className="panel"
                  style={{
                    width: '100%',
                    height: '358px',
                    borderRadius: '12px',
                    background: '#18181c',
                    borderColor: '#25252b',
                    padding: '16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Top info: Crest + Name + Leader */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Shield with Detailed Silver Roaring Lion */}
                      <div style={{ width: '94px', height: '102px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 10px rgba(225, 29, 46, 0.45))' }}>
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
                            <linearGradient id="lionManeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="100%" stopColor="#c5ccdc" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M50 3 L93 18 C93 72 50 115 50 117 C50 115 7 72 7 18 Z"
                            fill="url(#crestShieldBg)"
                            stroke="url(#crestShieldBorder)"
                            strokeWidth="3.2"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M50 9 L86 22 C86 67 50 105 50 107 C50 105 14 67 14 22 Z"
                            fill="none"
                            stroke="#e0263f"
                            strokeWidth="1.2"
                            opacity="0.45"
                          />
                          <g transform="translate(15, 20) scale(0.70)">
                            <path
                              d="M50 0 C56 5 62 3 67 9 C72 6 78 11 79 18 C85 17 89 24 87 31 C93 33 95 41 91 47 C96 52 94 61 88 66 C91 72 87 80 80 83 C82 89 75 96 68 97 C66 102 58 104 50 104 C42 104 34 102 32 97 C25 96 18 89 20 83 C13 80 9 72 12 66 C6 61 4 52 9 47 C5 41 7 33 13 31 C11 24 15 17 21 18 C22 11 28 6 33 9 C37 3 44 5 50 0 Z"
                              fill="url(#lionManeGrad)"
                              stroke="#120204"
                              strokeWidth="1.8"
                            />
                            <path
                              d="M50 0 L53 14 L60 8 L62 20 L72 16 L70 28 L82 26 L76 38 L86 42 L78 50 L86 58 L76 64 L80 74 L68 76 L66 88 L54 84 L50 96 L46 84 L34 88 L32 76 L20 74 L24 64 L14 58 L22 50 L14 42 L24 38 L18 26 L30 28 L28 16 L38 20 L40 8 L47 14 Z"
                              fill="#ffffff"
                            />
                            <path
                              d="M50 16 C35 16 26 28 26 46 C26 62 34 76 50 78 C66 76 74 62 74 46 C74 28 65 16 50 16 Z"
                              fill="#140205"
                            />
                            <path d="M32 26 C40 32 46 33 50 33 C54 33 60 32 68 26 C64 34 58 37 50 37 C42 37 36 34 32 26 Z" fill="#edf0f7" />
                            <path d="M48 37 L52 37 L53 48 L47 48 Z" fill="#edf0f7" />
                            <polygon points="32,40 43,42 36,46" fill="#e0263f" />
                            <polygon points="68,40 57,42 64,46" fill="#e0263f" />
                            <circle cx="38" cy="42" r="1.5" fill="#ffffff" />
                            <circle cx="62" cy="42" r="1.5" fill="#ffffff" />
                            <path d="M44 48 L56 48 L54 54 C54 56 52 58 50 58 C48 58 46 56 46 54 Z" fill="#edf0f7" />
                            <polygon points="47,49 53,49 50,54" fill="#140205" />
                            <path d="M38 54 C42 53 46 55 49 58 C47 62 42 63 38 61 C36 59 36 56 38 54 Z" fill="#ffffff" />
                            <path d="M62 54 C58 53 54 55 51 58 C53 62 58 63 62 61 C64 59 64 56 62 54 Z" fill="#ffffff" />
                            <path d="M40 62 C40 76 46 80 50 80 C54 80 60 76 60 62 Z" fill="#080002" />
                            <polygon points="41,62 44,70 46,62" fill="#ffffff" />
                            <polygon points="59,62 56,70 54,62" fill="#ffffff" />
                            <polygon points="47,62 50,65 53,62" fill="#edf0f7" />
                            <polygon points="43,79 45,72 47,79" fill="#ffffff" />
                            <polygon points="57,79 55,72 53,79" fill="#ffffff" />
                            <polygon points="48,79 50,76 52,79" fill="#edf0f7" />
                            <path d="M46 82 L50 90 L54 82 Z" fill="#ffffff" />
                          </g>
                        </svg>
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '23px', fontWeight: 700, color: '#f4f4f6', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                            {selectedTeam?.name || 'helloo new team'}
                          </h3>
                          <div className="chip" style={{ width: '39px', height: '25px', fontSize: '12px', fontWeight: 700 }}>
                            YOU
                          </div>
                        </div>
                        <p style={{ fontSize: '14px', color: '#9a9aa3', margin: '6px 0 0 0', lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                          Leader
                        </p>
                        <p style={{ fontSize: '21px', fontWeight: 600, color: '#f4f4f6', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                          {selectedTeamLeader}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '100%', height: '1px', background: '#26262c', margin: '10px 0 8px 0' }} />

                    {/* Team Members Header */}
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f6', margin: '0 0 8px 0', fontFamily: "'Rajdhani', sans-serif" }}>
                      Team Members ({displayMembers.length})
                    </p>
                  </div>

                  {/* 5 Member rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {displayMembers.slice(0, 5).map((member, i) => (
                      <div
                        key={member.id || i}
                        style={{
                          height: '32px',
                          background: '#1b1b20',
                          borderRadius: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '0 8px 0 0',
                        }}
                      >
                        <div className="num" style={{ width: '38px', height: '32px', borderRadius: '5px', fontSize: '15px' }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: '15px', color: '#e4e4e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>
                          {member.name || (member as any).full_name || `Member ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dual Stats Row: Total Spent (164px x 76px) & Remaining (165px x 76px) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Total Spent */}
                  <div
                    className="panel"
                    style={{
                      height: '76px',
                      borderRadius: '10px',
                      background: '#1a1a1f',
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '52px',
                        borderRadius: '9px',
                        background: '#3a1015',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="36" height="32" viewBox="0 0 36 32">
                        <g fill="#e8212e">
                          <ellipse cx="18" cy="6" rx="14" ry="5"/>
                          <path d="M4 9v5c0 3 6 5 14 5s14-2 14-5V9c0 3-6 5-14 5S4 12 4 9z"/>
                          <path d="M4 17v5c0 3 6 5 14 5s14-2 14-5v-5c0 3-6 5-14 5S4 20 4 17z"/>
                        </g>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: '#b5b5bd', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                        Total Spent
                      </p>
                      <p style={{ fontSize: '28px', fontWeight: 700, color: '#ff4350', fontVariantNumeric: 'tabular-nums', margin: '4px 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                        {formatCurrency(selectedTeamSpent)}
                      </p>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div
                    className="panel"
                    style={{
                      height: '76px',
                      borderRadius: '10px',
                      background: '#1a1a1f',
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Wallet size={34} style={{ color: '#f4f4f6', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: '#b5b5bd', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                        Remaining
                      </p>
                      <p style={{ fontSize: '28px', fontWeight: 700, color: '#3fe085', fontVariantNumeric: 'tabular-nums', margin: '4px 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                        {formatCurrency(selectedTeam?.budget || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Won Card (341px x 190px, background #1a1a1f, border #25252b) */}
                <div
                  className="panel"
                  style={{
                    height: '190px',
                    borderRadius: '10px',
                    background: '#1a1a1f',
                    borderColor: '#25252b',
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={21} style={{ color: '#f4f4f6' }} />
                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#f4f4f6', fontFamily: "'Inter', sans-serif" }}>
                      Items Won ({selectedTeamWonItems.length})
                    </span>
                  </div>

                  {/* Inner Box (318px x 120px, background #18181c, border #26262b) */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: '8px',
                      background: '#18181c',
                      border: '1px solid #26262b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedTeamWonItems.length === 0 ? (
                      <>
                        <Box size={34} style={{ color: '#8a8a93', strokeWidth: 1.5, marginBottom: '6px' }} />
                        <p style={{ fontSize: '15px', color: '#9a9aa3', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                          No items won yet.
                        </p>
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {selectedTeamWonItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              height: '32px',
                              padding: '0 8px',
                              background: '#141417',
                              borderRadius: '4px',
                            }}
                          >
                            <span style={{ fontSize: '13px', color: '#f4f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.item_name || item.question_ref}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ff3b47', fontFamily: "'Rajdhani', sans-serif" }}>
                              {formatCurrency(item.cost)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
