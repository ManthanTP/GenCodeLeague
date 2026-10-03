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
  Trophy,
  Flame,
  Lock,
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

  // Selected Team for Right Sidebar - In guest mode, collapsed if no team chosen
  const selectedTeam = useMemo(() => {
    if (!availableTeams || availableTeams.length === 0) return null;
    if (myTeamId && isTeamPanelOpen) {
      return availableTeams.find((t) => t.id === myTeamId) || null;
    }
    return null;
  }, [availableTeams, myTeamId, isTeamPanelOpen]);

  const effectiveMyTeamId = myTeamId || '';

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return teamMembersMap[selectedTeam.id] || [];
  }, [selectedTeam, teamMembersMap]);

  const displayMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return teamMembersMap[selectedTeam.id] || [];
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamLeader = useMemo(() => {
    if (!selectedTeam) return '';
    const members = teamMembersMap[selectedTeam.id] || [];
    const captain = members.find((m) => m.is_captain);
    return captain?.name || (captain as any)?.full_name || members[0]?.name || (members[0] as any)?.full_name || (selectedTeam as any).leader_name || 'Team Leader';
  }, [selectedTeam, teamMembersMap]);

  const gameState = eventState?.game_state || 'active';
  const roundIdx = eventState?.current_round_index ?? 0;
  const isAfterRound3 = pastRounds.some((r) => r.roundIndex === 2) || roundIdx >= 3;
  const questionIdx = eventState?.current_question_index ?? 0;
  const currentRound = DEFAULT_ROUNDS_DATA[roundIdx] || {
    name: `Round ${roundIdx + 1}`,
    questions: [],
  };
  const totalQuestions = currentRound.questions.length || 20;

  // Selected Team items won & spent strictly scoped to the CURRENT round (Resets every new round)
  const selectedTeamWonItems = useMemo(() => {
    if (!selectedTeam) return [];
    return items.filter((it) => it.team_id === selectedTeam.id && it.round_index === roundIdx);
  }, [selectedTeam, items, roundIdx]);

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
        Number(it.round_index) === Number(roundIdx) &&
        Number(it.question_index) === Number(questionIdx)
    ) || null;
  }, [items, roundIdx, questionIdx]);

  const soldBuyerTeam = useMemo(() => {
    if (!alreadySoldItem || !teams) return null;
    return teams.find((t) => t.id === alreadySoldItem.team_id) || null;
  }, [alreadySoldItem, teams]);

  const isQuestionSold = Boolean(alreadySoldItem);
  const isBiddingActive = Boolean(currentBidPreview && currentBidPreview.amount > 0 && !alreadySoldItem);

  // =========================================================================
  // DYNAMIC AUCTION BID DISPLAY LOGIC (SCOPED TO CURRENT ROUND ONLY)
  // =========================================================================

  // 1. Successful purchases in CURRENT round only, newest first
  const currentRoundSuccessfulBids = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items
      .filter((it) => it.round_index === roundIdx && Boolean(it.team_id))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [items, roundIdx]);

  // 2. Active Current Bid (visible ONLY while bid is active and NOT sold)
  const activeCurrentBid = useMemo(() => {
    if (!currentBidPreview || currentBidPreview.amount <= 0 || Boolean(alreadySoldItem)) {
      return null;
    }
    const team = teams.find((t) => t.id === currentBidPreview.teamId);
    return {
      round: roundIdx + 1,
      question: questionIdx + 1,
      teamName: team?.name || 'Active Team',
      amount: currentBidPreview.amount,
      questionRef: `Round ${roundIdx + 1} • Question ${questionIdx + 1}`,
      compactRef: `R${roundIdx + 1}-Q${questionIdx + 1}`,
    };
  }, [currentBidPreview, alreadySoldItem, teams, roundIdx, questionIdx]);

  // 3. Last Successful Bid (most recently sold question of the round)
  const lastSuccessfulBid = useMemo(() => {
    if (currentRoundSuccessfulBids.length === 0) return null;
    const latest = currentRoundSuccessfulBids[0];
    const team = teams.find((t) => t.id === latest.team_id);
    const qNum = (latest.question_index ?? 0) + 1;
    const rNum = (latest.round_index ?? roundIdx) + 1;
    return {
      id: latest.id,
      round: rNum,
      question: qNum,
      teamName: team?.name || 'Winning Team',
      amount: latest.cost,
      questionRef: `Round ${rNum} • Question ${qNum}`,
      compactRef: `R${rNum}-Q${qNum}`,
    };
  }, [currentRoundSuccessfulBids, teams, roundIdx]);

  // 4. Previous Bids Display List
  // CASE 5 & 8 (no current bid, >=2 sales): older purchases only (slice(1)) to prevent duplicate of Last Successful Bid
  // CASE 6 & 7 (active current bid, >=2 sales): all successful purchases with newest at top
  const previousBidsDisplayList = useMemo(() => {
    if (currentRoundSuccessfulBids.length < 2) return [];

    const source = activeCurrentBid
      ? currentRoundSuccessfulBids
      : currentRoundSuccessfulBids.slice(1);

    return source.map((item) => {
      const team = teams.find((t) => t.id === item.team_id);
      const qNum = (item.question_index ?? 0) + 1;
      const rNum = (item.round_index ?? roundIdx) + 1;
      const timeStr = item.created_at
        ? new Date(item.created_at).toLocaleTimeString('en-US', { hour12: false })
        : '--:--:--';
      return {
        id: item.id,
        compactRef: `R${rNum}-Q${qNum}`,
        questionRef: `Round ${rNum} • Question ${qNum}`,
        teamName: team?.name || 'Unknown Team',
        amount: item.cost,
        time: timeStr,
      };
    });
  }, [currentRoundSuccessfulBids, activeCurrentBid, teams, roundIdx]);

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
              GEN <span className="brand-heading-accent">CODE</span> LEAGUE
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
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '6px 28px 24px 28px' }}>
          {/* Top Right Controls: Viewing as Guest Dropdown & Icon-only Fullscreen Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '6px' }}>
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

            <button
              type="button"
              onClick={toggleFullscreen}
              className="panel"
              style={{
                width: '35px',
                height: '35px',
                padding: 0,
                borderRadius: '8px',
                background: '#18181c',
                border: '1px solid #2c2c33',
                color: isFullscreen ? '#e8212e' : '#f4f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize size={17} style={{ color: '#e8212e' }} /> : <Maximize size={17} />}
            </button>
          </div>

          {/* Main Arena Dynamic Grid (Left 1156px, Right 369px, Gap 26px / Full width if no panel) */}
          <div className={`gcl-live-arena-grid ${isTeamPanelOpen && selectedTeam ? 'has-panel' : 'no-panel'}`}>
            {/* LEFT COLUMN: 1156px (Question box, Bids row, Live Team Status) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '21px', width: '100%', minWidth: 0 }}>
              {/* 1. Question / Item Box with 3-Piece Red Diagonal Laser Strips */}
              <div
                className="panel red"
                style={{
                  minHeight: '158px',
                  height: 'auto',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '22px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
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

                {/* Left-aligned content: round meta and question text */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', flex: 1, minWidth: 0, padding: '0 16px', zIndex: 10, textAlign: 'left' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#e6e6ea', letterSpacing: '0.4px', fontFamily: "'Rajdhani', sans-serif" }}>
                        {currentRound.name.toUpperCase()}
                      </span>
                      <div style={{ width: '48px', height: '2px', background: '#e8212e' }} />
                    </div>
                    <div style={{ width: '1px', height: '18px', background: '#3a3a41' }} />
                    <span style={{ fontSize: '14px', letterSpacing: '0.4px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                      QUESTION {questionIdx + 1} OF {totalQuestions}
                    </span>
                    {alreadySoldItem ? (
                      <>
                        <div style={{ width: '1px', height: '18px', background: '#3a3a41' }} />
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: 'rgba(232, 33, 46, 0.22)',
                            border: '1px solid #e8212e',
                            color: '#ff4d5a',
                            fontSize: '13px',
                            fontWeight: 800,
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: '0.04em',
                          }}
                        >
                          <Lock size={13} /> QUESTION LOCKED — SOLD TO {soldBuyerTeam?.name?.toUpperCase() || 'TEAM'} ({formatCurrency(alreadySoldItem.cost)})
                        </span>
                      </>
                    ) : !isRevealed ? (
                      <>
                        <div style={{ width: '1px', height: '18px', background: '#3a3a41' }} />
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: 'rgba(234, 179, 8, 0.15)',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            color: '#facc15',
                            fontSize: '13px',
                            fontWeight: 800,
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#facc15', display: 'inline-block' }} className="animate-ping" />
                          AWAITING REVEAL
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: '1px', height: '18px', background: '#3a3a41' }} />
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#4ade80',
                            fontSize: '13px',
                            fontWeight: 800,
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} className="animate-pulse" />
                          LIVE QUESTION
                        </span>
                      </>
                    )}
                  </div>

                  {alreadySoldItem ? (
                    <h2
                      style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: '#f4f4f6',
                        lineHeight: 1.35,
                        margin: 0,
                        fontFamily: "'Rajdhani', sans-serif",
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {renderMultiLineText(alreadySoldItem.item_name || eventState?.current_item_name || '')}
                    </h2>
                  ) : isRevealed ? (
                    <h2
                      style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: '#f4f4f6',
                        lineHeight: 1.35,
                        margin: 0,
                        fontFamily: "'Rajdhani', sans-serif",
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {renderMultiLineText(eventState?.current_item_name || 'No question text set')}
                    </h2>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#e8212e',
                          display: 'inline-block',
                          boxShadow: '0 0 12px rgba(232, 33, 46, 0.9)',
                        }}
                        className="animate-pulse"
                      />
                      <h2
                        style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          color: '#9a9aa3',
                          lineHeight: 1.35,
                          margin: 0,
                          fontFamily: "'Rajdhani', sans-serif",
                          textAlign: 'left',
                          letterSpacing: '0.04em',
                          fontStyle: 'italic',
                        }}
                      >
                        Awaiting for Next Question...
                      </h2>
                    </div>
                  )}
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
                    border: alreadySoldItem
                      ? '1px solid rgba(232, 33, 46, 0.5)'
                      : !isRevealed
                      ? '1px solid rgba(234, 179, 8, 0.3)'
                      : isTimerRunning
                      ? '1px solid rgba(0, 229, 255, 0.4)'
                      : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {alreadySoldItem ? (
                      <Lock size={22} style={{ color: '#e8212e' }} />
                    ) : (
                      <Clock
                        size={22}
                        style={{
                          color: isExpired
                            ? '#ff4d5a'
                            : isTimerRunning
                            ? '#00e5ff'
                            : !isRevealed
                            ? '#eab308'
                            : '#e8212e',
                        }}
                        className={isTimerRunning ? 'animate-spin-slow' : ''}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '19px',
                        fontWeight: 600,
                        color: alreadySoldItem
                          ? '#ff4d5a'
                          : isExpired
                          ? '#ff4d5a'
                          : isTimerRunning
                          ? '#00e5ff'
                          : !isRevealed
                          ? '#facc15'
                          : '#c8c8ce',
                        fontFamily: "'Rajdhani', sans-serif",
                      }}
                    >
                      {alreadySoldItem
                        ? 'QUESTION SOLD'
                        : isExpired
                        ? 'TIME EXPIRED'
                        : !isRevealed
                        ? 'AWAITING'
                        : 'BID TIMER'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: alreadySoldItem ? '34px' : '46px',
                      fontWeight: 700,
                      fontFamily: "'Rajdhani', sans-serif",
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                      marginTop: '4px',
                      color: alreadySoldItem
                        ? '#ff4d5a'
                        : isExpired
                        ? '#ff4d5a'
                        : isTimerRunning
                        ? '#facc15'
                        : !isRevealed
                        ? '#9a9aa3'
                        : '#f4f4f6',
                      letterSpacing: alreadySoldItem ? '0.05em' : 'normal',
                    }}
                    className={isExpired ? 'animate-pulse' : ''}
                  >
                    {alreadySoldItem
                      ? 'LOCKED'
                      : timerFormatted}
                  </div>
                  <div style={{ width: '161px', height: '7px', borderRadius: '4px', background: '#26262c', marginTop: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '7px',
                        borderRadius: '4px',
                        background: alreadySoldItem
                          ? '#e8212e'
                          : isExpired
                          ? '#ff4d5a'
                          : isTimerRunning
                          ? '#facc15'
                          : '#4a4a55',
                        width: alreadySoldItem
                          ? '100%'
                          : (isTimerRunning && timeLeft > 0 && eventState?.timer_duration_seconds)
                          ? `${Math.max(0, Math.min(100, (timeLeft / eventState.timer_duration_seconds) * 100))}%`
                          : isExpired
                          ? '0%'
                          : '100%',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Dynamic Auction Display State Machine */}
              {(() => {
                const soldCount = currentRoundSuccessfulBids.length;
                const hasCurrent = Boolean(activeCurrentBid);

                // Helper to render Current Bid Card
                const renderCurrentBidCard = () => {
                  if (!activeCurrentBid) return null;
                  const isFireActive = activeCurrentBid.amount >= 5000000 && activeCurrentBid.amount % 5000000 === 0;

                  return (
                    <div
                      className="panel red gcl-card-animate"
                      style={{
                        minHeight: '161px',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                        minWidth: '320px',
                      }}
                    >
                      {/* Header: Pulsing red dot + CURRENT BID + Question Ref */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="dot" style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e8212e' }} />
                          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                            CURRENT BID
                          </span>
                          {isFireActive && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'linear-gradient(90deg, #ff4500, #ff8c00)',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 800,
                                fontFamily: "'Rajdhani', sans-serif",
                                letterSpacing: '0.05em',
                                boxShadow: '0 0 10px rgba(255, 69, 0, 0.8)',
                              }}
                            >
                              <Flame size={13} style={{ color: '#fff' }} />
                              HOT BID
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                            Question Ref:
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                            {activeCurrentBid.questionRef}
                          </span>
                        </div>
                      </div>

                      {/* Content: Vertical Gavel Tile, Bidding Team, Divider, Current Amount */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
                          <div
                            className={`panel ${isFireActive ? 'gcl-fire-aura' : ''}`}
                            style={{
                              width: '80px',
                              height: '76px',
                              borderRadius: '10px',
                              background: 'linear-gradient(180deg, #24242a, #18181c)',
                              border: isFireActive ? '1px solid #ff4500' : '1px solid #383844',
                              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              position: 'relative',
                            }}
                          >
                            <Hammer
                              size={40}
                              style={{
                                color: isFireActive ? '#ff5722' : '#e8212e',
                                strokeWidth: 1.8,
                                transform: 'rotate(0deg)',
                                filter: isFireActive ? 'drop-shadow(0 0 8px rgba(255,87,34,0.9))' : 'none',
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                              Bidding Team
                            </p>
                            <p style={{ fontSize: '25px', fontWeight: 700, color: '#f4f4f6', margin: '6px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                              {activeCurrentBid.teamName}
                            </p>
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div style={{ width: '1px', height: '65px', background: '#2e2e34' }} />

                        <div style={{ minWidth: 0, textAlign: 'left', flexShrink: 0 }}>
                          <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                            Current Amount
                          </p>
                          <p
                            style={{
                              fontSize: '40px',
                              fontWeight: 700,
                              color: '#ff3b47',
                              fontFamily: "'Rajdhani', sans-serif",
                              fontVariantNumeric: 'tabular-nums',
                              margin: '6px 0 0 0',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(activeCurrentBid.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                };

                // Helper to render Last Successful Bid Card
                const renderLastSuccessfulBidCard = () => {
                  if (!lastSuccessfulBid) return null;

                  return (
                    <div
                      className="panel gcl-card-animate"
                      style={{
                        minHeight: '161px',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                        minWidth: '320px',
                        background: '#18181d',
                        borderColor: '#2f2f38',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
                          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                            LAST SUCCESSFUL BID
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(34,197,94,0.15)',
                              border: '1px solid rgba(34,197,94,0.3)',
                              color: '#3fe085',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: "'Rajdhani', sans-serif",
                            }}
                          >
                            SOLD
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                            Question Ref:
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                            {lastSuccessfulBid.questionRef}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
                          <div
                            className="panel"
                            style={{
                              width: '80px',
                              height: '76px',
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
                            <Hammer
                              size={40}
                              className="gcl-hammer-strike"
                              style={{
                                color: '#22c55e',
                                strokeWidth: 1.8,
                                transform: 'rotate(0deg)',
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                              Winning Team
                            </p>
                            <p style={{ fontSize: '25px', fontWeight: 700, color: '#f4f4f6', margin: '6px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                              {lastSuccessfulBid.teamName}
                            </p>
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div style={{ width: '1px', height: '65px', background: '#2e2e34' }} />

                        <div style={{ minWidth: 0, textAlign: 'left', flexShrink: 0 }}>
                          <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                            Final Bid
                          </p>
                          <p
                            style={{
                              fontSize: '40px',
                              fontWeight: 700,
                              color: '#3fe085',
                              fontFamily: "'Rajdhani', sans-serif",
                              fontVariantNumeric: 'tabular-nums',
                              margin: '6px 0 0 0',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(lastSuccessfulBid.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                };

                // Helper to render Previous Bids Card
                const renderPreviousBidsCard = () => {
                  return (
                    <div
                      className="panel gcl-card-animate"
                      style={{
                        minHeight: '161px',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '14px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minWidth: '320px',
                        background: '#18181c',
                        borderColor: '#292930',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <History size={20} style={{ color: '#f4f4f6' }} />
                          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                            PREVIOUS BIDS
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                          Round {roundIdx + 1} Purchases
                        </span>
                      </div>

                      {/* Column Headers */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 100px',
                          alignItems: 'center',
                          padding: '0 8px 6px 8px',
                          borderBottom: '1px solid #282830',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#8e8e98',
                          fontFamily: "'Rajdhani', sans-serif",
                          letterSpacing: '0.05em',
                        }}
                      >
                        <div>ROUND-QUESTION</div>
                        <div>TEAM NAME</div>
                        <div style={{ textAlign: 'right' }}>VALUE</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', overflowY: 'auto', maxHeight: '86px', zIndex: 10 }}>
                        {previousBidsDisplayList.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', color: '#9a9aa3', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                            No previous purchases in this round
                          </div>
                        ) : (
                          previousBidsDisplayList.map((bid) => (
                            <div
                              key={bid.id}
                              className="gcl-row-enter"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '90px 1fr 100px',
                                alignItems: 'center',
                                gap: '8px',
                                height: '28px',
                                minHeight: '28px',
                                background: '#141418',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '4px',
                                padding: '0 8px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '20px',
                                  padding: '0 6px',
                                  borderRadius: '3px',
                                  background: '#22222a',
                                  color: '#e2e2e8',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  fontFamily: "'Rajdhani', sans-serif",
                                }}
                              >
                                {bid.compactRef}
                              </div>
                              <span style={{ fontSize: '14px', color: '#f4f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>
                                {bid.teamName}
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#ff4350', fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                                {formatCurrency(bid.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                };

                // CASE 1: 0 sold & no active bid -> SHOW NOTHING
                if (soldCount === 0 && !hasCurrent) {
                  return null;
                }

                // CASE 2: 0 sold & active bid -> SHOW CURRENT BID
                if (soldCount === 0 && hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row" style={{ display: 'flex', gap: '20px' }}>
                      {renderCurrentBidCard()}
                    </div>
                  );
                }

                // CASE 3: 1 sold & no active bid -> SHOW LAST SUCCESSFUL BID
                if (soldCount === 1 && !hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row" style={{ display: 'flex', gap: '20px' }}>
                      {renderLastSuccessfulBidCard()}
                    </div>
                  );
                }

                // CASE 4: 1 sold & active bid -> SHOW CURRENT BID + LAST SUCCESSFUL BID
                if (soldCount === 1 && hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {renderCurrentBidCard()}
                      {renderLastSuccessfulBidCard()}
                    </div>
                  );
                }

                // CASE 5 & 8: 2+ sold & no active bid -> SHOW LAST SUCCESSFUL BID + PREVIOUS BIDS (older purchases)
                if (soldCount >= 2 && !hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {renderLastSuccessfulBidCard()}
                      {renderPreviousBidsCard()}
                    </div>
                  );
                }

                // CASE 6 & 7: 2+ sold & active bid -> SHOW CURRENT BID + PREVIOUS BIDS (all purchases)
                if (soldCount >= 2 && hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {renderCurrentBidCard()}
                      {renderPreviousBidsCard()}
                    </div>
                  );
                }

                return null;
              })()}

              {/* 3. Live Team Status Table (1156px x 385px) */}
              <LiveTeamStatus
                teams={availableTeams}
                myTeamId={effectiveMyTeamId}
                items={items}
                currentRoundIndex={roundIdx}
                startingBudget={edition?.starting_budget || 50000000}
              />
            </div>

            {/* RIGHT COLUMN: 369px x 715px SELECTED TEAM & ITEMS WON (Shown only when team is selected) */}
            {isTeamPanelOpen && selectedTeam && (
              <div className="gcl-sidebar-enter" style={{ width: '100%', minWidth: 0 }}>
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
                  {/* Header row: SELECTED TEAM (Change button removed, close button for guest) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <span style={{ fontSize: '21px', fontWeight: 700, letterSpacing: '0.3px', color: '#f4f4f6', fontFamily: "'Rajdhani', sans-serif" }}>
                      SELECTED TEAM
                    </span>
                    {!isTeamLeader && (
                      <button
                        type="button"
                        onClick={handleCloseTeamPanel}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#9a9aa3',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Close Team View"
                      >
                        <X size={18} />
                      </button>
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
                      {/* Logo or Light Grey Trophy */}
                      {selectedTeam?.logo_url ? (
                        <div style={{ width: '84px', height: '84px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={selectedTeam.logo_url}
                            alt={selectedTeam.name}
                            style={{
                              maxWidth: '84px',
                              maxHeight: '84px',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '84px',
                            height: '84px',
                            borderRadius: '12px',
                            background: 'linear-gradient(145deg, #28282e, #18181c)',
                            border: '1px solid #383842',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 4px 12px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Trophy size={42} style={{ color: '#d0d0d8', strokeWidth: 1.8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                        </div>
                      )}

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

                  {/* Member rows (only real members, no fake Member 1..5) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {displayMembers.length === 0 ? (
                      <p style={{ fontSize: '14px', color: '#9a9aa3', margin: '6px 0', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
                        No members registered
                      </p>
                    ) : (
                      displayMembers.map((member, i) => (
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
                      ))
                    )}
                  </div>
                </div>

                {/* Dual Stats Row: Total Spent & Remaining with fitted font-size */}
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
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '44px',
                        borderRadius: '8px',
                        background: '#3a1015',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="28" height="26" viewBox="0 0 36 32">
                        <g fill="#e8212e">
                          <ellipse cx="18" cy="6" rx="14" ry="5"/>
                          <path d="M4 9v5c0 3 6 5 14 5s14-2 14-5V9c0 3-6 5-14 5S4 12 4 9z"/>
                          <path d="M4 17v5c0 3 6 5 14 5s14-2 14-5v-5c0 3-6 5-14 5S4 20 4 17z"/>
                        </g>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '12px', color: '#b5b5bd', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                        Round Spent
                      </p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#ff4350', fontVariantNumeric: 'tabular-nums', margin: '4px 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
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
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '44px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Wallet size={24} style={{ color: '#f4f4f6' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '12px', color: '#b5b5bd', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                        Remaining
                      </p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#3fe085', fontVariantNumeric: 'tabular-nums', margin: '4px 0 0 0', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
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
                          No items won in this round yet.
                        </p>
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {selectedTeamWonItems.map((item) => {
                          const qNum = (item.question_index ?? 0) + 1;
                          const rNum = (item.round_index ?? roundIdx) + 1;
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '32px',
                                padding: '0 8px',
                                background: '#141417',
                                border: '1px solid #222228',
                                borderRadius: '5px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: '3px',
                                    background: '#22222a',
                                    color: '#d0d0d8',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    fontFamily: "'Rajdhani', sans-serif",
                                  }}
                                >
                                  R{rNum}-Q{qNum}
                                </span>
                                <span style={{ fontSize: '13px', color: '#e0e0e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif" }}>
                                  Question {qNum}
                                </span>
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ff3b47', fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                {formatCurrency(item.cost)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
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
          </div>          <div className="max-w-5xl w-full mx-auto px-2">
            <div className="gcl-table-card">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1.4fr 110px 130px 130px 110px',
                  alignItems: 'center',
                  padding: '12px 18px',
                  background: '#16161c',
                  borderBottom: '1px solid #26262e',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#9a9aa3',
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: '0.05em',
                }}
              >
                <div>POS</div>
                <div>TEAM NAME</div>
                <div style={{ textAlign: 'center' }}>ITEMS BOUGHT</div>
                <div style={{ textAlign: 'right' }}>TOTAL SPENT</div>
                <div style={{ textAlign: 'right' }}>TOTAL REMAINING</div>
                <div style={{ textAlign: 'right' }}>STATUS</div>
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
                    const r1Result = (reveal?.team_id ? r1Snapshot?.results?.find((r) => r.id === reveal.team_id) : null) || r1Snapshot?.results?.[position - 1];
                    const teamObj = teams.find((t) => t.id === reveal?.team_id) || (r1Result?.id ? teams.find((t) => t.id === r1Result.id) : undefined);

                    // Robust fallback for team name: never blank during reveal time
                    const teamDisplayName =
                      reveal?.team_name ||
                      teamObj?.name ||
                      r1Result?.name ||
                      (isRevealed ? `Team ${position}` : '???');

                    const isMyTeam = isRevealed && (reveal?.team_id === myTeamId || teamObj?.id === myTeamId || r1Result?.id === myTeamId);

                    const teamId = reveal?.team_id || teamObj?.id || r1Result?.id;
                    const r1TeamItems = items.filter((it) => it.team_id === teamId && Number(it.round_index) === 0);
                    const r1ItemsCount = r1Result?.itemsCount ?? r1TeamItems.length;
                    const r1TotalSpent = r1Result?.totalSpent ?? r1TeamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
                    const startingBudget = edition?.starting_budget || 50000000;
                    const r1Remaining = r1Result?.remainingBudget !== undefined ? r1Result.remainingBudget : Math.max(0, startingBudget - r1TotalSpent);

                    if (!isRevealed) {
                      return (
                        <div
                          key={position}
                          className="gcl-leaderboard-row-reveal gcl-leaderboard-unrevealed"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '50px 1.4fr 110px 130px 130px 110px',
                            alignItems: 'center',
                            padding: '10px 18px',
                          }}
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
                          <div style={{ textAlign: 'center', color: '#555562', fontFamily: "'Rajdhani', sans-serif" }}>-</div>
                          <div style={{ textAlign: 'right', color: '#555562', fontFamily: "'Rajdhani', sans-serif" }}>-</div>
                          <div style={{ textAlign: 'right', color: '#555562', fontFamily: "'Rajdhani', sans-serif" }}>-</div>
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
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1.4fr 110px 130px 130px 110px',
                          alignItems: 'center',
                          padding: '10px 18px',
                        }}
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

                        <div style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#202028',
                              color: '#f4f4f6',
                              fontSize: '13px',
                              fontWeight: 700,
                              fontFamily: "'Rajdhani', sans-serif",
                            }}
                          >
                            {r1ItemsCount} {r1ItemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 700, color: '#ff4350', fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(r1TotalSpent)}
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 700, color: '#3fe085', fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(r1Remaining)}
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
        <div className="live-centered-screen" style={{ padding: '24px 16px' }}>
          {roundIdx === 1 ? (
            /* ROUND 2 INTERMISSION — COMPLETED STANDINGS & BUDGET CARRYOVER NOTICE */
            <div className="max-w-5xl w-full mx-auto space-y-6 gcl-card-animate">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 2 COMPLETE</span>
                </div>
                <h1 className="intermission-title">ROUND 2 INTERMISSION</h1>
                <p className="intermission-subtitle">ROUND 3 WILL START SOON — STAND BY...</p>
                <div className="intermission-warning-banner mt-4">
                  💰 BUDGET CARRYOVER NOTICE: ROUND 2 REMAINING BUDGET CARRIES OVER INTO ROUND 3 💰
                </div>
              </div>

              <div className="gcl-table-card" style={{ background: '#141418', border: '1px solid #282832', borderRadius: '14px', overflow: 'hidden' }}>
                <div className="px-5 py-3 bg-[#18181f] border-b border-[#26262e] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', letterSpacing: '0.05em' }}>ROUND 2 STANDINGS SUMMARY</span>
                  </div>
                  <span className="text-slate-400 font-mono">ROUND 2 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header" style={{ background: '#16161c', padding: '12px 18px', borderBottom: '1px solid #24242c' }}>
                  <div>#</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="divide-y divide-[#222228]">
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
                          style={{
                            background: isMyTeam ? 'rgba(232, 33, 46, 0.12)' : (idx % 2 === 0 ? '#18181d' : '#121216'),
                            padding: '12px 18px',
                          }}
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
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                background: '#202028',
                                color: '#f4f4f6',
                                fontSize: '13px',
                                fontWeight: 700,
                                fontFamily: "'Rajdhani', sans-serif",
                              }}
                            >
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
            <div className="max-w-5xl w-full mx-auto space-y-6 gcl-card-animate">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 1 COMPLETE</span>
                </div>
                <h1 className="intermission-title">ROUND 1 INTERMISSION</h1>
                <p className="intermission-subtitle">ROUND 2 WILL START SOON — STAND BY...</p>
                <div className="intermission-warning-banner mt-4">
                  ⚠️ BUDGET RESET NOTICE: ALL TEAMS RESET TO STARTING BUDGET FOR ROUND 2 ⚠️
                </div>
              </div>

              <div className="gcl-table-card" style={{ background: '#141418', border: '1px solid #282832', borderRadius: '14px', overflow: 'hidden' }}>
                <div className="px-5 py-3 bg-[#18181f] border-b border-[#26262e] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', letterSpacing: '0.05em' }}>ROUND 1 STANDINGS SUMMARY</span>
                  </div>
                  <span className="text-slate-400 font-mono">ROUND 1 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header" style={{ background: '#16161c', padding: '12px 18px', borderBottom: '1px solid #24242c' }}>
                  <div>POS</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="divide-y divide-[#222228]">
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
                          style={{
                            background: isMyTeam ? 'rgba(232, 33, 46, 0.12)' : (i % 2 === 0 ? '#18181d' : '#121216'),
                            padding: '12px 18px',
                          }}
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
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                background: '#202028',
                                color: '#f4f4f6',
                                fontSize: '13px',
                                fontWeight: 700,
                                fontFamily: "'Rajdhani', sans-serif",
                              }}
                            >
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
            <div className="max-w-5xl w-full mx-auto space-y-6 gcl-card-animate">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 3 COMPLETE</span>
                </div>
                <h1 className="intermission-title">
                  {isAfterRound3 ? 'RESULTS WILL BE ANNOUNCED SOON' : 'NEXT ROUND WILL START SOON'}
                </h1>
                <p className="intermission-subtitle">STAND BY...</p>
              </div>

              <div className="gcl-table-card" style={{ background: '#141418', border: '1px solid #282832', borderRadius: '14px', overflow: 'hidden' }}>
                <div className="px-5 py-3 bg-[#18181f] border-b border-[#26262e] flex items-center justify-between text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', letterSpacing: '0.05em' }}>ROUND 3 STANDINGS SUMMARY</span>
                  </div>
                  <span className="text-slate-400 font-mono">ROUND 3 SUMMARY</span>
                </div>
                <div className="gcl-leaderboard-header" style={{ background: '#16161c', padding: '12px 18px', borderBottom: '1px solid #24242c' }}>
                  <div>#</div>
                  <div>TEAM NAME</div>
                  <div className="text-center">TOTAL ITEMS</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REMAINING</div>
                </div>

                <div className="divide-y divide-[#222228]">
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
                          style={{
                            background: isMyTeam ? 'rgba(232, 33, 46, 0.12)' : (idx % 2 === 0 ? '#18181d' : '#121216'),
                            padding: '12px 18px',
                          }}
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
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                background: '#202028',
                                color: '#f4f4f6',
                                fontSize: '13px',
                                fontWeight: 700,
                                fontFamily: "'Rajdhani', sans-serif",
                              }}
                            >
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
