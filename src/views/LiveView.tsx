import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  UserCircle,
  Trophy,
  Wallet,
  LayoutDashboard,
  Hammer,
  Zap,
  History,
  Medal,
  Award,
  Crown,
  Clock,
  AlertTriangle,
  AlertCircle,
  Users,
  Maximize,
  Minimize,
  Coins,
  Package,
  Box,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTeamItems } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import { useLeaderboardReveal } from '../hooks/useLeaderboardReveal';
import Header from '../components/Header';
import ConnectionHealth from '../components/ConnectionHealth';
import LiveTeamStatus from '../components/LiveTeamStatus';
import { formatCurrency, renderMultiLineText } from '../utils/formatters';
import { DEFAULT_ROUNDS_DATA } from '../data/roundsData';
import type { PastRoundSnapshot, LeaderboardRevealEntry, TeamMember } from '../types/database';

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

  // Selected personal team ID for viewer
  const [myTeamId, setMyTeamId] = useState<string>('');
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});

  // Auto-select first team so sidebar and highlight are populated like mockup
  useEffect(() => {
    if (!myTeamId && teams.length > 0) {
      setMyTeamId(teams[0].id);
    }
  }, [teams, myTeamId]);

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
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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

  // Sorted teams for dropdown selects (A to Z)
  const sortedTeamsDropdown = useMemo(() => {
    return [...teams].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [teams]);

  // Last successful bid derived from team_items (Result: Correct/Incorrect hidden from live view)
  const lastBidDetails = useMemo(() => {
    if (!items || items.length === 0) return null;
    const lastItem = items[0]; // sorted by created_at desc
    const team = teams.find((t) => t.id === lastItem.team_id);
    return {
      teamName: team?.name || 'Unknown Team',
      questionRef: lastItem.question_ref || `R${lastItem.round_index + 1} - Q${lastItem.question_index + 1}`,
      amount: formatCurrency(lastItem.cost),
      status: lastItem.is_correct ? 'correct' : 'wrong',
    };
  }, [items, teams]);

  // Personal team stats for viewer (Scores and ranks completely hidden)
  const myTeamStats = useMemo(() => {
    if (!myTeamId) return null;
    return teamsWithStats.find((t) => t.id === myTeamId) || null;
  }, [teamsWithStats, myTeamId]);

  // Persistent Selected Team for Right Sidebar
  const selectedTeam = useMemo(() => {
    if (myTeamId) {
      return teams.find((t) => t.id === myTeamId) || teams[0] || null;
    }
    return teams[0] || null;
  }, [teams, myTeamId]);

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    const members = teamMembersMap[selectedTeam.id] || [];
    if (members.length > 0) return members;
    // Fallback to 5 members matching the mockup if none in database yet
    return [
      { id: '1', name: 'Member 1' },
      { id: '2', name: 'Member 2' },
      { id: '3', name: 'Member 3' },
      { id: '4', name: 'Member 4' },
      { id: '5', name: 'Member 5' },
    ];
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamLeader = useMemo(() => {
    if (!selectedTeam) return 'Manthan Patel';
    const members = teamMembersMap[selectedTeam.id] || [];
    const captain = members.find((m) => m.is_captain);
    return captain?.name || captain?.full_name || members[0]?.name || members[0]?.full_name || 'Manthan Patel';
  }, [selectedTeam, teamMembersMap]);

  const selectedTeamWonItems = useMemo(() => {
    if (!selectedTeam) return [];
    return items.filter((it) => it.team_id === selectedTeam.id);
  }, [selectedTeam, items]);

  const selectedTeamSpent = useMemo(() => {
    return selectedTeamWonItems.reduce((acc, it) => acc + (it.cost || 0), 0);
  }, [selectedTeamWonItems]);

  const previousBidsList = useMemo(() => {
    if (items && items.length > 0) {
      return items.slice(0, 3).map((item, idx) => {
        const team = teams.find((t) => t.id === item.team_id);
        const timeStr = item.created_at
          ? new Date(item.created_at).toLocaleTimeString('en-US', { hour12: false })
          : '14:28:10';
        return {
          id: item.id || String(idx),
          index: idx + 1,
          teamName: team?.name || 'Unknown Team',
          amount: formatCurrency(item.cost),
          time: timeStr,
        };
      });
    }
    return [
      { id: '1', index: 1, teamName: teams[2]?.name || 'New team 2', amount: '₹50.00 L', time: '14:28:10' },
      { id: '2', index: 2, teamName: teams[1]?.name || 'Team Alpha', amount: '₹30.00 L', time: '14:27:42' },
      { id: '3', index: 3, teamName: teams[0]?.name || 'New team 1', amount: '₹10.00 L', time: '14:26:15' },
    ];
  }, [items, teams]);

  if (stateLoading) {
    return (
      <div className="gcl-loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Connecting to Live Auction...</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen text-white pb-16 font-sans gcl-page-enter">
      <Header
        totalSpent={totalSpent}
        totalAvailable={totalAvailable}
        teamCount={teams.length}
        viewMode="live"
      />

      <ConnectionHealth isConnected={true} />

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

      {/* 3. ACTIVE ROUND STATE */}
      {gameState === 'active' && (
        <div className="max-w-[1720px] mx-auto px-4 lg:px-6 pt-3 pb-8">
          {/* Top Right Secondary Actions: Viewer dropdown & Fullscreen button */}
          <div className="flex items-center justify-end gap-3 mb-3">
            <div className="relative">
              <select
                value={myTeamId}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="bg-[#13141a] border border-[#262732] text-slate-300 text-xs font-semibold px-3.5 py-1.5 rounded-lg appearance-none pr-8 cursor-pointer hover:border-red-500/40 transition-colors focus:outline-none shadow-sm"
              >
                <option value="">Viewing as Guest (Select Team)</option>
                {sortedTeamsDropdown.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-[#13141a] border border-[#262732] rounded-lg text-slate-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>

          {/* Main Arena 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: 8 cols (~68-70%) */}
            <div className="lg:col-span-8 space-y-5">
              {/* 1. Question / Item Box with Red Diagonal Laser Streak */}
              <div className="relative bg-[#0f1015] border border-[#22232d] rounded-2xl p-6 sm:p-7 overflow-hidden shadow-2xl">
                {/* Red laser light cut on left edge */}
                <div
                  className="absolute top-0 left-0 w-44 h-full pointer-events-none opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(224, 38, 63, 0.45) 0%, rgba(224, 38, 63, 0.1) 30%, transparent 60%)',
                  }}
                />
                <div className="absolute top-0 left-0 w-1.5 h-20 bg-[#e0263f] shadow-[0_0_12px_#e0263f] rounded-br-sm" />

                {/* Top Bar inside Question Card: Ref Left, Bid Timer Right */}
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                      <span className="text-white font-extrabold">{currentRound.name.toUpperCase()}</span>
                      <span className="text-slate-600">|</span>
                      <span>QUESTION {questionIdx + 1} OF {totalQuestions}</span>
                    </div>
                    <div className="w-14 h-0.5 bg-[#e0263f] rounded-full shadow-[0_0_8px_#e0263f]" />
                  </div>

                  {/* BID TIMER Corner Widget */}
                  <div className="bg-[#14151b] border border-[#262732] rounded-xl px-5 py-2 flex flex-col items-center shadow-lg">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-red-400">
                      <Clock size={12} className={isTimerRunning ? 'text-[#e0263f] animate-spin-slow' : 'text-red-400'} />
                      <span>BID TIMER</span>
                    </div>
                    <div className={`text-3xl sm:text-4xl font-black font-mono tracking-wider mt-0.5 ${isExpired ? 'text-red-500' : 'text-white'}`}>
                      {timerFormatted || '02:48'}
                    </div>
                    <div className="w-full h-1 bg-[#e0263f] rounded-full mt-1.5 shadow-[0_0_8px_#e0263f]" />
                  </div>
                </div>

                {/* Main Question Text */}
                <div className="mt-5 mb-1 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                    {eventState?.current_item_name
                      ? renderMultiLineText(eventState.current_item_name)
                      : `Q${questionIdx + 1}: What is the output of console.log(typeof NaN)?`}
                  </h2>
                </div>
              </div>

              {/* 2. Middle Row: CURRENT BID & PREVIOUS BIDS side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Current Bid Card */}
                <div className="relative bg-[#0f1015] border border-red-500/40 rounded-2xl p-5 overflow-hidden shadow-[0_0_20px_rgba(224,38,63,0.15)]">
                  {/* Red corner ambient glow */}
                  <div className="absolute top-0 left-0 w-28 h-28 bg-gradient-to-br from-red-600/25 via-red-600/5 to-transparent rounded-tl-2xl pointer-events-none" />
                  <div className="absolute top-0 left-0 w-1 h-12 bg-[#e0263f] rounded-br-sm" />

                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e0263f] shadow-[0_0_8px_#e0263f] animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      CURRENT BID
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_10px_rgba(224,38,63,0.2)] flex-shrink-0">
                        <Hammer size={22} className="-rotate-45" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">
                          BIDDING TEAM
                        </p>
                        <p className="text-base sm:text-lg font-black text-white mt-1 truncate">
                          {activeBidTeam?.name || (currentBidPreview && currentBidPreview.amount > 0 ? 'Active Team' : (lastBidDetails?.teamName || 'New team 3'))}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">
                        CURRENT AMOUNT
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-[#e0263f] font-mono mt-1">
                        {currentBidPreview && currentBidPreview.amount > 0
                          ? formatCurrency(currentBidPreview.amount)
                          : (lastBidDetails ? lastBidDetails.amount : '₹70.00 L')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Previous Bids Card */}
                <div className="relative bg-[#0f1015] border border-red-500/30 rounded-2xl p-5 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-red-600/15 via-transparent to-transparent rounded-tl-2xl pointer-events-none" />

                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <History size={15} className="text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      PREVIOUS BIDS
                    </span>
                  </div>

                  <div className="space-y-2 relative z-10">
                    {previousBidsList.map((bid) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between py-1 border-b border-[#181922] last:border-b-0 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="w-5 h-5 rounded bg-[#181920] border border-[#2a2b34] text-slate-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                            {bid.index}
                          </span>
                          <span className="font-semibold text-slate-200 truncate">
                            {bid.teamName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 font-mono">
                          <span className="font-bold text-[#e0263f]">
                            {bid.amount}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {bid.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Live Team Status Table */}
              <LiveTeamStatus
                teams={teams}
                myTeamId={myTeamId || selectedTeam?.id}
                items={items}
              />
            </div>

            {/* RIGHT COLUMN: 4 cols (~30-32%) - Persistent Selected Team Sidebar */}
            <div className="lg:col-span-4 space-y-5">
              {/* Card 1: SELECTED TEAM */}
              <div className="relative bg-[#0f1015] border border-red-500/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(224,38,63,0.2)] overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

                {/* Header row: Label + Change dropdown */}
                <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    SELECTED TEAM
                  </span>
                  <div className="relative">
                    <select
                      value={myTeamId}
                      onChange={(e) => setMyTeamId(e.target.value)}
                      className="bg-[#181920] border border-[#2a2b34] text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-md appearance-none pr-6 cursor-pointer hover:border-red-500/40 transition-colors focus:outline-none"
                    >
                      {sortedTeamsDropdown.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Team Identity: Roaring Lion Shield Crest + Name + Leader */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-[#1c1d25] relative z-10">
                  {/* Detailed Roaring Lion Shield Crest */}
                  <div className="relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_16px_rgba(224,38,63,0.65)]">
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white truncate">
                        {selectedTeam?.name || 'helloo new team'}
                      </h3>
                      <span className="bg-[#e0263f] text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                        YOU
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      Leader
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                      {selectedTeamLeader}
                    </p>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="mt-4 relative z-10">
                  <p className="text-xs font-bold text-slate-400 mb-2">
                    Team Members ({selectedTeamMembers.length})
                  </p>
                  <div className="space-y-1">
                    {selectedTeamMembers.map((member, i) => (
                      <div
                        key={member.id || i}
                        className="flex items-center gap-3 py-1 text-xs text-slate-300"
                      >
                        <span className="w-5 h-5 rounded bg-[#181920] border border-[#2a2b34] text-slate-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">
                          {member.name || (member as any).full_name || `Member ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dual Stats Row: Total Spent & Remaining */}
                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#1c1d25] relative z-10">
                  {/* Total Spent */}
                  <div className="bg-[#14151b] border border-[#23242e] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
                    <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-500 flex-shrink-0">
                      <Coins size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                        Total Spent
                      </p>
                      <p className="text-base font-black text-red-400 font-mono mt-1 leading-tight truncate">
                        {formatCurrency(selectedTeamSpent)}
                      </p>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="bg-[#14151b] border border-red-500/30 rounded-xl p-3 flex items-center gap-2.5 shadow-[0_0_12px_rgba(224,38,63,0.12)]">
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                      <Wallet size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                        Remaining
                      </p>
                      <p className="text-base font-black text-emerald-400 font-mono mt-1 leading-tight truncate">
                        {formatCurrency(selectedTeam?.budget || 50000000)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Items Won */}
              <div className="bg-[#0f1015] border border-[#22232d] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={15} className="text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Items Won ({selectedTeamWonItems.length})
                  </span>
                </div>

                {selectedTeamWonItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-7 text-center">
                    <Box size={36} className="text-slate-600 mb-2 stroke-[1.5]" />
                    <p className="text-xs text-slate-500 font-medium">
                      No items won yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedTeamWonItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#14151b] border border-[#22232a] text-xs"
                      >
                        <span className="font-semibold text-slate-200 truncate pr-2">
                          {item.item_name || item.question_ref}
                        </span>
                        <span className="font-mono font-bold text-red-400 flex-shrink-0">
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
