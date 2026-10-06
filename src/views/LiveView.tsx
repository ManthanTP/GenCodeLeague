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
  Check,
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
import { AnimatedText } from '../components/ui/animated-shiny-text';
import { useFitText } from '../hooks/useFitText';
import './LiveScreens.css';

// Auto-fitting Team Name inside the Champions podium block
function PodiumTeamName({
  name,
  isRevealed,
}: {
  name: string;
  isRevealed: boolean;
}) {
  const { containerRef, textRef } = useFitText(name, isRevealed);

  if (!isRevealed || !name) return null;

  return (
    <div ref={containerRef} className="live-podium-name-area">
      <span ref={textRef} className="live-podium-team-name">
        {name}
      </span>
    </div>
  );
}

// Two-handled Trophy Cup inline SVG component for the podium
function TrophyCup({
  size = 76,
  color = '#f5b73b',
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 16px ${color}88)`, ...style }}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v6c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" fill={`${color}22`} />
    </svg>
  );
}

// Progress Stepper for Intermission screens
function ProgressStepper({ currentStage }: { currentStage: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'ROUND 1' },
    { num: 2, label: 'ROUND 2' },
    { num: 3, label: 'ROUND 3' },
    { num: 4, label: 'FINAL' },
  ];

  return (
    <div className="live-stepper-wrap" aria-label="Tournament progress">
      {steps.map((step, idx) => {
        const isCompleted = step.num <= currentStage;
        const isUpcoming = step.num === currentStage + 1;

        return (
          <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="live-step-node">
              <div
                className={`live-step-circle ${
                  isCompleted
                    ? 'live-step-completed'
                    : isUpcoming
                    ? 'live-step-upcoming'
                    : 'live-step-dim'
                }`}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : step.num}
              </div>
              <span
                className="live-step-label"
                style={{
                  color: isCompleted ? '#ffffff' : isUpcoming ? '#ff4d5a' : '#656573',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`live-step-line ${
                  step.num < currentStage + 1 ? 'completed' : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'clip',
        boxSizing: 'border-box',
        position: 'relative',
        ...(isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              overflowY: 'auto',
              width: '100%',
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
        <div className="live-waiting-start-screen">
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 10, maxWidth: '56rem', width: '100%', padding: '0 16px', boxSizing: 'border-box' as const }}>
            <h1 className="grand-title">
              GEN <span className="brand-heading-accent">CODE</span> LEAGUE
            </h1>
            <AnimatedText
              text="Auction Starting Soon"
              gradientColors="linear-gradient(90deg, #6b6b6b, #ffffff, #6b6b6b)"
              gradientAnimationDuration={2}
              hoverEffect
              textClassName="gcl-display"
              style={{ padding: '4px 0' }}
            />

            {/* Team Selector on Waiting Screen */}
            <div className="team-selector-card">
              <p className="team-selector-label">
                <UserCircle size={20} /> Select the Team
              </p>
              <select
                value={myTeamId}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="gcl-select"
              >
                <option value="">Viewing as Guest (Select Team)</option>
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
        <div className="gcl-live-container">
          {/* Top Right Controls: Viewing as Guest Dropdown & Icon-only Fullscreen Button (44px touch targets) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
            {!isTeamLeader && (
              <div style={{ position: 'relative', width: '270px' }}>
                <select
                  value={myTeamId}
                  onChange={(e) => handleSelectTeam(e.target.value)}
                  className="panel"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#18181c',
                    border: '1px solid #2c2c33',
                    color: '#d6d6dc',
                    fontSize: '15px',
                    padding: '0 36px 0 14px',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: 'none',
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
                width: '44px',
                height: '44px',
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
            <div className="gcl-live-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '21px', width: '100%', minWidth: 0 }}>
              {/* 1. Question / Item Box with 3-Piece Red Diagonal Laser Strips */}
              <div className="panel red gcl-question-card">
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
                    filter: 'drop-shadow(0 0 5px rgba(255,42,56,.8))',
                  }}
                />
                <div
                  className="strip"
                  style={{
                    clipPath: 'polygon(99px 0, 101px 0, 0 101px, 0 99px)',
                    background: 'rgba(255,255,255,.18)',
                  }}
                />

                {/* Left-aligned content: starts past corner laser effect */}
                <div className="gcl-question-content">
                  <div className="gcl-question-header-row" style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#e6e6ea', letterSpacing: '0.6px', fontFamily: "'Rajdhani', sans-serif" }}>
                        {currentRound.name.toUpperCase()}
                      </span>
                      <div style={{ width: '56px', height: '3px', background: '#e8212e' }} />
                    </div>
                    <div style={{ width: '1px', height: '20px', background: '#3a3a41' }} />
                    <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px', color: '#9a9aa3', fontFamily: "'Inter', sans-serif" }}>
                      QUESTION {questionIdx + 1} OF {totalQuestions}
                    </span>
                    {alreadySoldItem && (
                      <>
                        <div style={{ width: '1px', height: '20px', background: '#3a3a41' }} />
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: 'rgba(232, 33, 46, 0.22)',
                            border: '1px solid #e8212e',
                            color: '#ff4d5a',
                            fontSize: '14px',
                            fontWeight: 800,
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: '0.04em',
                          }}
                        >
                          <Lock size={14} /> QUESTION LOCKED — SOLD TO {soldBuyerTeam?.name?.toUpperCase() || 'TEAM'} ({formatCurrency(alreadySoldItem.cost)})
                        </span>
                      </>
                    )}
                  </div>

                  {alreadySoldItem ? (
                    <h2
                      className="gcl-question-title"
                      style={{
                        fontSize: 'clamp(28px, 2.4vw, 40px)',
                        fontWeight: 800,
                        color: '#f4f4f6',
                        lineHeight: 1.25,
                        margin: 0,
                        fontFamily: "'Rajdhani', sans-serif",
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {renderMultiLineText(alreadySoldItem.item_name || eventState?.current_item_name || '')}
                    </h2>
                  ) : isRevealed ? (
                    <h2
                      className="gcl-question-title"
                      style={{
                        fontSize: 'clamp(28px, 2.4vw, 40px)',
                        fontWeight: 800,
                        color: '#f4f4f6',
                        lineHeight: 1.25,
                        margin: 0,
                        fontFamily: "'Rajdhani', sans-serif",
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {renderMultiLineText(eventState?.current_item_name || 'No question text set')}
                    </h2>
                  ) : (
                    <h2
                      className="gcl-question-title"
                      style={{
                        fontSize: 'clamp(26px, 2.2vw, 36px)',
                        fontWeight: 700,
                        color: '#80808a',
                        lineHeight: 1.25,
                        margin: 0,
                        fontFamily: "'Rajdhani', sans-serif",
                        textAlign: 'left',
                        fontStyle: 'italic',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Awaiting for Next Question...
                    </h2>
                  )}
                </div>

                {/* Right: BID TIMER (Under question on mobile, full width with digits right and bar underneath) */}
                <div
                  className="panel gcl-question-timer"
                  style={{
                    border: alreadySoldItem ? '1px solid rgba(232, 33, 46, 0.5)' : undefined,
                  }}
                >
                  <div className="gcl-question-timer-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {alreadySoldItem ? (
                        <Lock size={22} style={{ color: '#e8212e' }} />
                      ) : (
                        <Clock size={22} style={{ color: '#e8212e' }} />
                      )}
                      <span style={{ fontSize: '19px', fontWeight: 600, color: alreadySoldItem ? '#ff4d5a' : '#c8c8ce', fontFamily: "'Rajdhani', sans-serif" }}>
                        {alreadySoldItem ? 'QUESTION SOLD' : 'BID TIMER'}
                      </span>
                    </div>
                    <div
                      className="gcl-question-timer-digits"
                      style={{
                        fontSize: alreadySoldItem ? '34px' : '46px',
                        fontWeight: 700,
                        fontFamily: "'Rajdhani', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                        color: alreadySoldItem ? '#ff4d5a' : '#f4f4f6',
                        letterSpacing: alreadySoldItem ? '0.05em' : 'normal',
                      }}
                    >
                      {alreadySoldItem
                        ? 'LOCKED'
                        : timerFormatted}
                    </div>
                  </div>
                  <div className="gcl-question-timer-bar-wrap">
                    <div
                      style={{
                        height: '7px',
                        borderRadius: '4px',
                        background: '#e8212e',
                        width: alreadySoldItem
                          ? '100%'
                          : ((isTimerRunning && timeLeft > 0 && eventState?.timer_duration_seconds)
                          ? `${Math.max(0, Math.min(100, (timeLeft / eventState.timer_duration_seconds) * 100))}%`
                          : '0%'),
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
                    <div className="panel red gcl-card-animate card--sheen gcl-current-bid-card">
                      {/* Header: Pulsing red dot + CURRENT BID */}
                      <div className="gcl-current-bid-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="dot" style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#e8212e' }} />
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
                      </div>

                      {/* Content: 2-part row (Left side: 64x64 Hammer tile + Text stack | 1px Divider | Right side: Amount) */}
                      <div className="gcl-current-bid-body">
                        <div className="gcl-current-bid-team-side">
                          <div
                            className={`panel ${isFireActive ? 'gcl-fire-aura' : ''}`}
                            style={{
                              width: '64px',
                              height: '64px',
                              minWidth: '64px',
                              minHeight: '64px',
                              borderRadius: '10px',
                              background: 'linear-gradient(180deg, #24242a, #18181c)',
                              border: isFireActive ? '1px solid #ff4500' : '1px solid #383844',
                              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Hammer
                              size={34}
                              style={{
                                color: isFireActive ? '#ff5722' : '#e8212e',
                                strokeWidth: 1.8,
                                transform: 'rotate(0deg)',
                                filter: isFireActive ? 'drop-shadow(0 0 8px rgba(255,87,34,0.9))' : 'none',
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' }}>
                              Bidding Team
                            </p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#f4f4f6', margin: '4px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                              {activeCurrentBid.teamName}
                            </p>
                            <div className="gcl-current-bid-ref" style={{ marginTop: '4px' }}>
                              <span className="gcl-ref-label">
                                Question Ref:
                              </span>
                              <span className="gcl-ref-val">
                                {activeCurrentBid.questionRef}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div className="gcl-current-bid-divider" />

                        <div className="gcl-current-bid-amount-side">
                          <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' }}>
                            Current Amount
                          </p>
                          <p className="gcl-current-bid-amount">
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
                      className="panel gcl-card-animate gcl-current-bid-card"
                      style={{
                        background: '#18181d',
                        borderColor: '#2f2f38',
                      }}
                    >
                      {/* Header */}
                      <div className="gcl-current-bid-header">
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
                      </div>

                      {/* Content: 2-part row */}
                      <div className="gcl-current-bid-body">
                        <div className="gcl-current-bid-team-side">
                          <div
                            className="panel"
                            style={{
                              width: '64px',
                              height: '64px',
                              minWidth: '64px',
                              minHeight: '64px',
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
                              size={34}
                              className="gcl-hammer-strike"
                              style={{
                                color: '#22c55e',
                                strokeWidth: 1.8,
                                transform: 'rotate(0deg)',
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' }}>
                              Winning Team
                            </p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#f4f4f6', margin: '4px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Rajdhani', sans-serif" }}>
                              {lastSuccessfulBid.teamName}
                            </p>
                            <div className="gcl-current-bid-ref" style={{ marginTop: '4px' }}>
                              <span className="gcl-ref-label">
                                Question Ref:
                              </span>
                              <span className="gcl-ref-val">
                                {lastSuccessfulBid.questionRef}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div className="gcl-current-bid-divider" />

                        <div className="gcl-current-bid-amount-side">
                          <p style={{ fontSize: '12px', color: '#9a9aa3', letterSpacing: '0.5px', margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' }}>
                            Final Bid
                          </p>
                          <p
                            className="gcl-current-bid-amount"
                            style={{ color: '#3fe085' }}
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
                      className="panel gcl-card-animate gcl-prev-bids-card"
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
                      <div className="gcl-prev-bids-header">
                        <div>ROUND-Q</div>
                        <div>TEAM NAME</div>
                        <div style={{ textAlign: 'right' }}>VALUE</div>
                        <div style={{ textAlign: 'right' }}>TIME</div>
                      </div>

                      <div className="gcl-prev-bids-scroll" style={{ zIndex: 10 }}>
                        {previousBidsDisplayList.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', color: '#9a9aa3', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                            No previous purchases in this round
                          </div>
                        ) : (
                          previousBidsDisplayList.map((bid) => (
                            <div
                              key={bid.id}
                              className="gcl-row-enter gcl-prev-bids-row"
                            >
                              <div className="gcl-prev-bids-chip">
                                {bid.compactRef}
                              </div>
                              <span className="gcl-prev-bids-team">
                                {bid.teamName}
                              </span>
                              <span className="gcl-prev-bids-amount">
                                {formatCurrency(bid.amount)}
                              </span>
                              <span className="gcl-prev-bids-time">
                                {bid.time}
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
                    <div className="gcl-live-bid-row">
                      {renderCurrentBidCard()}
                    </div>
                  );
                }

                // CASE 3: 1 sold & no active bid -> SHOW LAST SUCCESSFUL BID
                if (soldCount === 1 && !hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row">
                      {renderLastSuccessfulBidCard()}
                    </div>
                  );
                }

                // CASE 4: 1 sold & active bid -> SHOW CURRENT BID + LAST SUCCESSFUL BID
                if (soldCount === 1 && hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row">
                      {renderCurrentBidCard()}
                      {renderLastSuccessfulBidCard()}
                    </div>
                  );
                }

                // CASE 5 & 8: 2+ sold & no active bid -> SHOW LAST SUCCESSFUL BID + PREVIOUS BIDS (older purchases)
                if (soldCount >= 2 && !hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row">
                      {renderLastSuccessfulBidCard()}
                      {renderPreviousBidsCard()}
                    </div>
                  );
                }

                // CASE 6 & 7: 2+ sold & active bid -> SHOW CURRENT BID + PREVIOUS BIDS (all purchases)
                if (soldCount >= 2 && hasCurrent) {
                  return (
                    <div className="gcl-live-bid-row">
                      {renderCurrentBidCard()}
                      {renderPreviousBidsCard()}
                    </div>
                  );
                }

                return null;
              })()}

              {/* 3. Live Team Status Table (1156px x 385px) */}
              <div className="gcl-live-team-status-wrap" style={{ width: '100%' }}>
                <LiveTeamStatus
                  teams={availableTeams}
                  myTeamId={effectiveMyTeamId}
                  items={items}
                  currentRoundIndex={roundIdx}
                  startingBudget={edition?.starting_budget || 50000000}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: 369px x 715px SELECTED TEAM & ITEMS WON (Shown only when team is selected) */}
            {isTeamPanelOpen && selectedTeam && (
              <div className="gcl-sidebar-enter" style={{ width: '100%', minWidth: 0 }}>
                <div
                  className="panel red gcl-selected-team-panel"
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
                  className="panel gcl-team-identity-card"
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

      {/* 3b. ROUND 1 LEADERBOARD REVEAL STATE (Screen 1: Sequential Manual Reveal) */}
      {(gameState === 'leaderboard_reveal' ||
        eventState?.round_state === 'LEADERBOARD_REVEAL' ||
        eventState?.round_state === 'LEADERBOARD_HIDDEN') && (() => {
        const r1Snapshot = pastRounds.find((r) => r.roundIndex === 0);
        const totalCount = Math.max(
          teams.length,
          effectiveReveals.length,
          r1Snapshot?.results?.length || 0
        );

        // Compute standings rows and find the most recently revealed team
        const rowDataList = Array.from({ length: totalCount }, (_, i) => {
          const position = i + 1;
          const reveal = effectiveReveals.find((r) => r.position === position);
          const isRevealed = Boolean(reveal?.is_revealed);
          const r1Result = (reveal?.team_id ? r1Snapshot?.results?.find((r) => r.id === reveal.team_id) : null) || r1Snapshot?.results?.[position - 1];
          const teamObj = teams.find((t) => t.id === reveal?.team_id) || (r1Result?.id ? teams.find((t) => t.id === r1Result.id) : undefined);

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

          return {
            position,
            isRevealed,
            teamDisplayName,
            isMyTeam,
            teamId,
            r1ItemsCount,
            r1TotalSpent,
            r1Remaining,
            revealedAt: reveal?.revealed_at,
          };
        });

        // Most recently revealed team for Spotlight Card
        const revealedRows = rowDataList.filter((r) => r.isRevealed);
        let latestSpotlight: typeof rowDataList[0] | null = null;
        if (revealedRows.length > 0) {
          const withTime = revealedRows.filter((r) => r.revealedAt);
          if (withTime.length > 0) {
            latestSpotlight = [...revealedRows].sort((a, b) => {
              const tA = a.revealedAt ? new Date(a.revealedAt).getTime() : 0;
              const tB = b.revealedAt ? new Date(b.revealedAt).getTime() : 0;
              if (tB !== tA) return tB - tA;
              return a.position - b.position;
            })[0];
          } else {
            // Bottom to top: smallest position number is revealed last
            latestSpotlight = [...revealedRows].sort((a, b) => a.position - b.position)[0];
          }
        }

        return (
          <div className="live-screen-container">
            {/* Centered Header */}
            <div className="text-center mb-8">
              <div className="inline-block mb-3">
                <span className="badge-official">ROUND 1 OFFICIAL STANDINGS</span>
              </div>
              <h1 className="live-reveal-header-title">LEADERBOARD REVEAL</h1>
              <p
                className="text-xs sm:text-sm text-slate-400 font-mono uppercase tracking-widest mt-2"
                style={{ letterSpacing: '0.2em' }}
              >
                Revealing from bottom to top
              </p>
            </div>

            {/* Two Column Layout on Desktop, Single Column on Mobile */}
            <div className="live-reveal-grid">
              {/* Left Column: Spotlight Card (Sticky on Desktop) */}
              <div className="live-spotlight-card">
                <div
                  className="live-card-glow"
                  style={{ padding: '24px', textAlign: 'center' }}
                  aria-live="polite"
                >
                  {!latestSpotlight ? (
                    <div style={{ padding: '40px 16px' }}>
                      <div
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '50%',
                          background: 'rgba(255, 42, 61, 0.12)',
                          border: '1px solid rgba(255, 42, 61, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px auto',
                        }}
                      >
                        <Lock size={36} className="text-red-500" />
                      </div>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontSize: '28px',
                          fontWeight: 800,
                          color: '#ffffff',
                          letterSpacing: '0.02em',
                        }}
                      >
                        Who's next?
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '11px',
                          color: '#8a8a95',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginTop: '6px',
                        }}
                      >
                        Awaiting team reveal
                      </p>
                    </div>
                  ) : (
                    <div key={latestSpotlight.position} className="live-spotlight-content">
                      <div
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#8a8a95',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                        }}
                      >
                        POSITION
                      </div>

                      {/* Huge Position Number */}
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontSize: '110px',
                          fontWeight: 900,
                          lineHeight: 1,
                          marginTop: '4px',
                          marginBottom: '8px',
                          color:
                            latestSpotlight.position === 1
                              ? '#f5b73b'
                              : latestSpotlight.position === 2
                              ? '#c3c7d2'
                              : latestSpotlight.position === 3
                              ? '#e8743b'
                              : '#8a8a95',
                          filter:
                            latestSpotlight.position === 1
                              ? 'drop-shadow(0 0 20px rgba(245, 183, 59, 0.45))'
                              : latestSpotlight.position === 2
                              ? 'drop-shadow(0 0 16px rgba(195, 199, 210, 0.35))'
                              : latestSpotlight.position === 3
                              ? 'drop-shadow(0 0 16px rgba(232, 116, 59, 0.35))'
                              : 'none',
                        }}
                      >
                        {String(latestSpotlight.position).padStart(2, '0')}
                      </div>

                      {/* Team Name with Medal Icon for Top 3 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: '20px',
                        }}
                      >
                        {latestSpotlight.position === 1 && (
                          <Crown size={22} className="text-yellow-400 shrink-0 animate-bounce" />
                        )}
                        {latestSpotlight.position === 2 && (
                          <Medal size={22} className="text-slate-300 shrink-0" />
                        )}
                        {latestSpotlight.position === 3 && (
                          <Medal size={22} className="text-orange-400 shrink-0" />
                        )}
                        <span
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontSize: '22px',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {latestSpotlight.teamDisplayName}
                        </span>
                      </div>

                      {/* Two Small Tiles: Spent (red) & Remaining (green) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            background: 'rgba(255, 42, 61, 0.08)',
                            border: '1px solid rgba(255, 42, 61, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#ff6675',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              marginBottom: '2px',
                            }}
                          >
                            SPENT
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 800,
                              color: '#ff2a3d',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(latestSpotlight.r1TotalSpent)}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            background: 'rgba(47, 209, 111, 0.08)',
                            border: '1px solid rgba(47, 209, 111, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#4ee38b',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              marginBottom: '2px',
                            }}
                          >
                            REMAINING
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 800,
                              color: '#2fd16f',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(latestSpotlight.r1Remaining)}
                          </div>
                        </div>
                      </div>

                      {/* Team Members List */}
                      {(() => {
                        const members = latestSpotlight.teamId ? (teamMembersMap[latestSpotlight.teamId] || []) : [];
                        return (
                          <div className="live-spotlight-members-wrap">
                            <div className="live-spotlight-members-header">
                              Team members ({members.length})
                            </div>
                            {members.length === 0 ? (
                              <p className="live-spotlight-no-members">No members listed</p>
                            ) : (
                              <div className="live-spotlight-members-list">
                                {members.map((m, idx) => {
                                  const memberName = m.name || m.full_name || `Member ${idx + 1}`;
                                  const isLeader = Boolean(m.is_captain || idx === 0);
                                  return (
                                    <div key={m.id || idx} className="live-spotlight-member-row">
                                      <div className="live-spotlight-member-num">
                                        {idx + 1}
                                      </div>
                                      <div className="live-spotlight-member-name" title={memberName}>
                                        {memberName}
                                        {isLeader && (
                                          <span style={{ fontSize: '11px', color: '#f5b73b', fontWeight: 700, marginLeft: '6px' }}>
                                            (Leader)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Standings Card */}
              <div className="live-card-glow" style={{ padding: '16px' }}>
                {/* Header row (Pos, Team, Items, Spent, Remaining, Status) - Desktop only */}
                <div
                  className="live-table-header"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px minmax(0, 1.4fr) 100px 120px 120px 105px',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    background: '#16161c',
                    borderRadius: '10px',
                    borderBottom: '1px solid #26262e',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#8a8a95',
                    fontFamily: "'Rajdhani', sans-serif",
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  <div>POS</div>
                  <div>TEAM</div>
                  <div style={{ textAlign: 'center' }}>ITEMS</div>
                  <div style={{ textAlign: 'right' }}>SPENT</div>
                  <div style={{ textAlign: 'right' }}>REMAINING</div>
                  <div style={{ textAlign: 'right' }}>STATUS</div>
                </div>

                {/* Team Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rowDataList.map((row) => {
                    const {
                      position,
                      isRevealed,
                      teamDisplayName,
                      isMyTeam,
                      r1ItemsCount,
                      r1TotalSpent,
                      r1Remaining,
                    } = row;

                    if (!isRevealed) {
                      return (
                        <div
                          key={position}
                          className="live-standings-row-grid live-row-locked"
                        >
                          <div className="live-rank-chip live-rank-chip-plain">?</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#656573',
                                letterSpacing: '0.08em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: '#ff2a3d',
                                  display: 'inline-block',
                                }}
                              />
                              AWAITING REVEAL
                            </span>
                          </div>
                          <div className="live-col-desktop" style={{ textAlign: 'center', color: '#454552' }}>-</div>
                          <div className="live-col-desktop" style={{ textAlign: 'right', color: '#454552' }}>-</div>
                          <div className="live-col-desktop" style={{ textAlign: 'right', color: '#454552' }}>-</div>
                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#555563',
                              letterSpacing: '0.08em',
                            }}
                          >
                            LOCKED
                          </div>
                          {/* Mobile compact summary */}
                          <div
                            className="live-col-mobile"
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '11px',
                              color: '#555563',
                            }}
                          >
                            LOCKED
                          </div>
                        </div>
                      );
                    }

                    // Revealed Row
                    const medalClass =
                      position === 1
                        ? 'live-medal-gold'
                        : position === 2
                        ? 'live-medal-silver'
                        : position === 3
                        ? 'live-medal-bronze'
                        : 'live-row-plain';

                    const chipClass =
                      position === 1
                        ? 'live-rank-chip-gold'
                        : position === 2
                        ? 'live-rank-chip-silver'
                        : position === 3
                        ? 'live-rank-chip-bronze'
                        : 'live-rank-chip-plain';

                    return (
                      <div
                        key={position}
                        className={`live-standings-row-grid ${medalClass} live-row-reveal-flip`}
                      >
                        {/* Chip */}
                        <div className={`live-rank-chip ${chipClass}`}>
                          {String(position).padStart(2, '0')}
                        </div>

                        {/* Team Name */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                            paddingRight: '6px',
                          }}
                        >
                          {position === 1 && (
                            <Crown size={18} className="text-yellow-400 shrink-0 animate-bounce" />
                          )}
                          {position === 2 && (
                            <Medal size={18} className="text-slate-300 shrink-0" />
                          )}
                          {position === 3 && (
                            <Medal size={18} className="text-orange-400 shrink-0" />
                          )}
                          <span
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '0.02em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {teamDisplayName}
                          </span>
                          {isMyTeam && <span className="badge-you-inline">YOU</span>}
                        </div>

                        {/* Items (desktop) */}
                        <div className="live-col-desktop" style={{ textAlign: 'center' }}>
                          <span className="live-items-pill">
                            {r1ItemsCount} {r1ItemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Spent (desktop) */}
                        <div
                          className="live-col-desktop"
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#ff2a3d',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCurrency(r1TotalSpent)}
                        </div>

                        {/* Remaining (desktop) */}
                        <div
                          className="live-col-desktop"
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#2fd16f',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCurrency(r1Remaining)}
                        </div>

                        {/* Status (desktop) */}
                        <div
                          className="live-col-desktop"
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                          }}
                        >
                          {position === 1 ? (
                            <span style={{ color: '#f5b73b' }}>1ST PLACE</span>
                          ) : position === 2 ? (
                            <span style={{ color: '#c3c7d2' }}>2ND PLACE</span>
                          ) : position === 3 ? (
                            <span style={{ color: '#e8743b' }}>3RD PLACE</span>
                          ) : (
                            <span style={{ color: '#8a8a95' }}>REVEALED</span>
                          )}
                        </div>

                        {/* Mobile view: remaining / spent */}
                        <div
                          className="live-col-mobile"
                          style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '2px',
                            textAlign: 'right',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#2fd16f',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(r1Remaining)}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#ff2a3d',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(r1TotalSpent)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. INTERMISSION STATE (Screens 2, 3, 4: Round 1, Round 2, Round 3 Intermissions) */}
      {gameState === 'intermission' && (() => {
        const stageNum: 1 | 2 | 3 = roundIdx === 0 ? 1 : roundIdx === 1 ? 2 : 3;

        return (
          <div className="live-screen-container">
            <div className="live-intermission-layout">
              {/* Centered Hero Block */}
              <div className="live-intermission-hero-block" aria-live="polite">
                {/* 1. Progress Stepper centered */}
                <ProgressStepper currentStage={stageNum} />

                {/* 2. Small pill "ROUND X COMPLETE" */}
                <div className="inline-block mt-4 mb-2">
                  <span className="badge-official">ROUND {stageNum} COMPLETE</span>
                </div>

                {/* 3 & 4. Big Bold Title & Subtext */}
                {roundIdx === 0 ? (
                  <>
                    <h1 className="live-intermission-title">
                      ROUND 1 INTERMISSION
                    </h1>
                    <p className="live-intermission-subtext">
                      ROUND 2 WILL START SOON. STAND BY…
                    </p>
                  </>
                ) : roundIdx === 1 ? (
                  <>
                    <h1 className="live-intermission-title">
                      ROUND 2 INTERMISSION
                    </h1>
                    <p className="live-intermission-subtext">
                      ROUND 3 WILL START SOON. STAND BY…
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="live-intermission-title">
                      RESULTS WILL BE ANNOUNCED SOON
                    </h1>
                    <p className="live-intermission-subtext">
                      STAND BY…
                    </p>
                  </>
                )}

                {/* 5. Circular Standby Pulsing Ring */}
                <div className="live-standby-ring" aria-hidden="true">
                  <svg className="live-standby-spinner" viewBox="0 0 88 88" fill="none">
                    <circle cx="44" cy="44" r="38" stroke="#262630" strokeWidth="3" />
                    <circle
                      cx="44"
                      cy="44"
                      r="38"
                      stroke="#ff2a3d"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="60 180"
                    />
                  </svg>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#ff2a3d',
                      boxShadow: '0 0 10px #ff2a3d',
                    }}
                  />
                </div>

                {/* 6. Notice Banner (if Round 1 or 2) centered with max-width ~760px */}
                {roundIdx === 0 && (
                  <div className="live-amber-notice" style={{ maxWidth: '760px', width: '100%', margin: '14px auto 0 auto' }}>
                    ⚠️ BUDGET RESET NOTICE: ALL TEAMS RESET TO STARTING BUDGET FOR ROUND 2 ⚠️
                  </div>
                )}
                {roundIdx === 1 && (
                  <div className="live-amber-notice" style={{ maxWidth: '760px', width: '100%', margin: '14px auto 0 auto' }}>
                    💰 BUDGET CARRYOVER NOTICE: ROUND 2 REMAINING BUDGET CARRIES OVER INTO ROUND 3 💰
                  </div>
                )}
              </div>

              {/* 7. Summary / Standings Card (centered, full width up to ~1100px, natural height) */}
              <div style={{ width: '100%', maxWidth: '1100px', margin: '32px auto 0 auto', boxSizing: 'border-box' }}>
                <div
                  className="live-card-glow live-intermission-card"
                  style={{
                    width: '100%',
                    padding: '16px',
                  }}
                >
              {/* Header row with red dot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px 12px 12px',
                  borderBottom: '1px solid #24242e',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ff2a3d',
                      boxShadow: '0 0 8px #ff2a3d',
                      display: 'inline-block',
                    }}
                    className="animate-pulse"
                  />
                  <span
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#ff6675',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ROUND {stageNum} STANDINGS SUMMARY
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    color: '#8a8a95',
                    letterSpacing: '0.05em',
                  }}
                >
                  ROUND {stageNum} SUMMARY
                </span>
              </div>

              {/* Table header (Desktop only) */}
              <div
                className="live-table-header"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px minmax(0, 1.4fr) 100px 120px 120px',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  background: '#16161c',
                  borderRadius: '8px',
                  borderBottom: '1px solid #26262e',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#8a8a95',
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <div>#</div>
                <div>TEAM NAME</div>
                <div style={{ textAlign: 'center' }}>ITEMS</div>
                <div style={{ textAlign: 'right' }}>SPENT</div>
                <div style={{ textAlign: 'right' }}>REMAINING</div>
              </div>

              {/* Table rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {roundIdx === 0 ? (
                  /* Round 1 Summary Rows (keeps position chip & top 3 medal style) */
                  (() => {
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

                      const medalClass =
                        position === 1
                          ? 'live-medal-gold'
                          : position === 2
                          ? 'live-medal-silver'
                          : position === 3
                          ? 'live-medal-bronze'
                          : 'live-row-plain';

                      const chipClass =
                        position === 1
                          ? 'live-rank-chip-gold'
                          : position === 2
                          ? 'live-rank-chip-silver'
                          : position === 3
                          ? 'live-rank-chip-bronze'
                          : 'live-rank-chip-plain';

                      return (
                        <div
                          key={entry.id || position}
                          className={`live-summary-row-grid ${medalClass}`}
                        >
                          <div className={`live-rank-chip ${chipClass}`}>
                            {String(position).padStart(2, '0')}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              paddingRight: '6px',
                            }}
                          >
                            {position === 1 && (
                              <Crown size={18} className="text-yellow-400 shrink-0" />
                            )}
                            {position === 2 && (
                              <Medal size={18} className="text-slate-300 shrink-0" />
                            )}
                            {position === 3 && (
                              <Medal size={18} className="text-orange-400 shrink-0" />
                            )}
                            <span
                              style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '16px',
                                fontWeight: 800,
                                color: '#ffffff',
                                letterSpacing: '0.02em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {teamName}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>

                          <div className="live-col-desktop" style={{ textAlign: 'center' }}>
                            <span className="live-items-pill">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#ff2a3d',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(totalSpent)}
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#2fd16f',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(remaining)}
                          </div>

                          {/* Mobile compact summary */}
                          <div
                            className="live-col-mobile"
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '2px',
                              textAlign: 'right',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#2fd16f',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(remaining)}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#ff2a3d',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(totalSpent)}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : roundIdx === 1 ? (
                  /* Round 2 Summary Rows (keeps existing order, plain rows only) */
                  [...teams]
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
                          className="live-summary-row-grid live-row-plain"
                        >
                          <div className="live-rank-chip live-rank-chip-plain">
                            {String(idx + 1).padStart(2, '0')}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              paddingRight: '6px',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '16px',
                                fontWeight: 800,
                                color: '#ffffff',
                                letterSpacing: '0.02em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {team.name}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>

                          <div className="live-col-desktop" style={{ textAlign: 'center' }}>
                            <span className="live-items-pill">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#ff2a3d',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(totalSpent)}
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#2fd16f',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(displayRemaining)}
                          </div>

                          {/* Mobile compact summary */}
                          <div
                            className="live-col-mobile"
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '2px',
                              textAlign: 'right',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#2fd16f',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(displayRemaining)}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#ff2a3d',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(totalSpent)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  /* Round 3 Summary Rows (keeps existing order, plain rows only) */
                  [...teams]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                    .map((team, idx) => {
                      const isMyTeam = team.id === myTeamId;
                      const teamItems = items.filter((it) => it.team_id === team.id && it.round_index === 2);
                      const totalItems = teamItems.length;
                      const totalSpent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);

                      return (
                        <div
                          key={team.id}
                          className="live-summary-row-grid live-row-plain"
                        >
                          <div className="live-rank-chip live-rank-chip-plain">
                            {String(idx + 1).padStart(2, '0')}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              paddingRight: '6px',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '16px',
                                fontWeight: 800,
                                color: '#ffffff',
                                letterSpacing: '0.02em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {team.name}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          </div>

                          <div className="live-col-desktop" style={{ textAlign: 'center' }}>
                            <span className="live-items-pill">
                              {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#ff2a3d',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(totalSpent)}
                          </div>

                          <div
                            className="live-col-desktop"
                            style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#2fd16f',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(team.budget)}
                          </div>

                          {/* Mobile compact summary */}
                          <div
                            className="live-col-mobile"
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '2px',
                              textAlign: 'right',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#2fd16f',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(team.budget)}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#ff2a3d',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(totalSpent)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })()}

      {/* 5. WINNER REVEAL STATE (Screen 5: Final Champions Reveal) */}
      {gameState === 'winner_reveal' && (() => {
        const firstTeam = teams.find((t) => t.id === podiumState.firstTeamId);
        const firstName = firstTeam?.name || (podiumState as any)?.firstTeamName || (podiumState.firstTeamId ? 'Champion' : '');

        const secondTeam = teams.find((t) => t.id === podiumState.secondTeamId);
        const secondName = secondTeam?.name || (podiumState as any)?.secondTeamName || (podiumState.secondTeamId ? 'Runner-Up' : '');

        const thirdTeam = teams.find((t) => t.id === podiumState.thirdTeamId);
        const thirdName = thirdTeam?.name || (podiumState as any)?.thirdTeamName || (podiumState.thirdTeamId ? '3rd Place' : '');

        return (
          <div className="live-screen-container">
            {/* Header: huge gold-gradient "CHAMPIONS" with glow */}
            <div className="text-center mb-10">
              <h1 className="live-champions-header-title">CHAMPIONS</h1>
              <p
                className="text-xs sm:text-sm text-slate-400 font-mono uppercase tracking-widest mt-2"
                style={{ letterSpacing: '0.2em' }}
              >
                Grand final standings
              </p>
            </div>

            {/* Podium (full width 3-column grid with soft radial spotlight) */}
            <div className={`live-podium-spotlight-wrap ${podiumState.firstRevealed ? 'is-gold-spotlight' : 'is-red-spotlight'}`}>
              <div className="live-podium-grid" aria-live="polite">
                {/* 2nd Place Column (Left) */}
                <div className="live-podium-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minWidth: 0 }}>
                  <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '12px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                    {podiumState.secondRevealed && (secondTeam || secondName) ? (
                      <div className="live-podium-revealed-wrap" style={{ width: '100%', maxWidth: '100%', minWidth: 0, textAlign: 'center', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <TrophyCup className="live-trophy-silver" color="#c3c7d2" />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <div className="live-podium-hidden-circle">?</div>
                        <p
                          className="live-podium-hidden-label"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#6a6a78',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                          }}
                        >
                          HIDDEN
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={`live-podium-block live-podium-h-2 ${
                      podiumState.secondRevealed ? 'live-podium-block-silver' : 'live-podium-block-dark'
                    }`}
                  >
                    <span className="live-podium-rank-chip">2</span>
                    <PodiumTeamName
                      name={secondName}
                      isRevealed={Boolean(podiumState.secondRevealed && (secondTeam || secondName))}
                    />
                  </div>
                </div>

                {/* 1st Place Column (Center) */}
                <div className="live-podium-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '100%', minWidth: 0 }}>
                  <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '14px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                    {podiumState.firstRevealed && (firstTeam || firstName) ? (
                      <div className="live-podium-revealed-wrap" style={{ width: '100%', maxWidth: '100%', minWidth: 0, textAlign: 'center', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <TrophyCup className="live-trophy-gold" color="#f5b73b" />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <div className="live-podium-hidden-circle">?</div>
                        <p
                          className="live-podium-hidden-label"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#6a6a78',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                          }}
                        >
                          HIDDEN
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={`live-podium-block live-podium-h-1 ${
                      podiumState.firstRevealed ? 'live-podium-block-gold' : 'live-podium-block-dark'
                    }`}
                  >
                    <span className="live-podium-rank-chip">1</span>
                    <PodiumTeamName
                      name={firstName}
                      isRevealed={Boolean(podiumState.firstRevealed && (firstTeam || firstName))}
                    />
                  </div>
                </div>

                {/* 3rd Place Column (Right) */}
                <div className="live-podium-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minWidth: 0 }}>
                  <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '10px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                    {podiumState.thirdRevealed && (thirdTeam || thirdName) ? (
                      <div className="live-podium-revealed-wrap" style={{ width: '100%', maxWidth: '100%', minWidth: 0, textAlign: 'center', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <TrophyCup className="live-trophy-bronze" color="#e8743b" />
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <div className="live-podium-hidden-circle">?</div>
                        <p
                          className="live-podium-hidden-label"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#6a6a78',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                          }}
                        >
                          HIDDEN
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={`live-podium-block live-podium-h-3 ${
                      podiumState.thirdRevealed ? 'live-podium-block-bronze' : 'live-podium-block-dark'
                    }`}
                  >
                    <span className="live-podium-rank-chip">3</span>
                    <PodiumTeamName
                      name={thirdName}
                      isRevealed={Boolean(podiumState.thirdRevealed && (thirdTeam || thirdName))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Final Championship Standings Table (FULL width, remove 760px cap) */}
            <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, margin: '48px 0 0 0', boxSizing: 'border-box' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  textAlign: 'center',
                  maxWidth: '100%',
                }}
              >
                <Crown size={22} className="text-yellow-400 shrink-0" />
                <h2
                  className="live-championship-title"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                    margin: 0,
                  }}
                >
                  Final Championship Standings
                </h2>
              </div>

              <div className="live-card-glow" style={{ padding: '16px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                {/* Header row (Desktop only) */}
                <div
                  className="live-table-header"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.4fr) 110px 130px 130px',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    background: '#16161c',
                    borderRadius: '8px',
                    borderBottom: '1px solid #26262e',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#8a8a95',
                    fontFamily: "'Rajdhani', sans-serif",
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  <div>TEAM NAME</div>
                  <div style={{ textAlign: 'center' }}>ITEMS WON</div>
                  <div style={{ textAlign: 'right' }}>TOTAL SPENT</div>
                  <div style={{ textAlign: 'right' }}>TOTAL REM.</div>
                </div>

                {/* Rows: EXACT ORDER PRESERVED from overallStats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overallStats.map((team) => {
                    const isGrandChampion = Boolean(
                      ((team.id === podiumState.firstTeamId || team.name === (podiumState as any)?.firstTeamName) &&
                        podiumState.firstRevealed)
                    );
                    const isRunnerUp = Boolean(
                      ((team.id === podiumState.secondTeamId || team.name === (podiumState as any)?.secondTeamName) &&
                        podiumState.secondRevealed)
                    );
                    const isThirdPlace = Boolean(
                      ((team.id === podiumState.thirdTeamId || team.name === (podiumState as any)?.thirdTeamName) &&
                        podiumState.thirdRevealed)
                    );
                    const isOutOfBudget = team.totalRemaining <= 0;
                    const isMyTeam = team.id === myTeamId;

                    const rowClass = isGrandChampion
                      ? 'live-medal-gold'
                      : isRunnerUp
                      ? 'live-medal-silver'
                      : isThirdPlace
                      ? 'live-medal-bronze'
                      : 'live-row-plain';

                    return (
                      <div
                        key={team.id}
                        className={`live-final-row-grid ${rowClass}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            minWidth: 0,
                            paddingRight: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          {isGrandChampion && (
                            <Crown size={18} className="text-yellow-400 shrink-0 animate-bounce" />
                          )}
                          {isRunnerUp && (
                            <Medal size={18} className="text-slate-300 shrink-0" />
                          )}
                          {isThirdPlace && (
                            <Medal size={18} className="text-orange-400 shrink-0" />
                          )}
                          <span
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '15px',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '0.02em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              flex: '0 1 auto',
                            }}
                          >
                            {team.name}
                          </span>
                          {isMyTeam && <span className="badge-you-inline">YOU</span>}
                          {isOutOfBudget && (
                            <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                          )}
                          {isGrandChampion && (
                            <span className="live-badge-champion">GRAND CHAMPION</span>
                          )}
                          {isRunnerUp && (
                            <span className="live-badge-runnerup">RUNNER-UP</span>
                          )}
                          {isThirdPlace && (
                            <span className="live-badge-third">3RD PLACE</span>
                          )}
                        </div>

                        {/* Items won pill (desktop) */}
                        <div className="live-col-desktop" style={{ textAlign: 'center' }}>
                          <span className="live-items-pill">
                            {team.totalItems} {team.totalItems === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Total spent (desktop) */}
                        <div
                          className="live-col-desktop"
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#ff2a3d',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCurrency(team.totalSpent)}
                        </div>

                        {/* Total remaining (desktop) */}
                        <div
                          className="live-col-desktop"
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#2fd16f',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCurrency(team.totalRemaining)}
                        </div>

                        {/* Mobile compact summary */}
                        <div
                          className="live-col-mobile"
                          style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '2px',
                            textAlign: 'right',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#2fd16f',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(team.totalRemaining)}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#ff2a3d',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(team.totalSpent)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
