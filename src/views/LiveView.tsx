import { useState, useMemo } from 'react';
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
} from 'lucide-react';
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
import type { PastRoundSnapshot, LeaderboardRevealEntry } from '../types/database';

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
    <div className="min-h-screen bg-slate-950 text-white pb-16 font-sans gcl-page-enter">
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
          <div className="ambient-glow glow-blue"></div>
          <div className="ambient-glow glow-indigo"></div>
          <div className="text-center space-y-6 max-w-4xl z-10">
            <div className="inline-block mb-4">
              <Settings size={72} className="text-slate-500 animate-spin-slow mx-auto" />
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-400 tracking-tighter gcl-display">
              EVENT SETUP
            </h1>
            <div className="divider-cyan"></div>
            <p className="text-xl text-slate-400 font-mono uppercase tracking-widest animate-pulse">
              Configuration in Progress...
            </p>
          </div>
        </div>
      )}

      {/* 2. WAITING START STATE */}
      {gameState === 'waiting_start' && (
        <div className="live-centered-screen">
          <div className="ambient-glow glow-blue"></div>
          <div className="ambient-glow glow-indigo"></div>
          <div className="text-center space-y-6 max-w-4xl z-10 px-4">
            <div className="inline-block mb-2">
              <span className="badge-official">Official Auction</span>
            </div>
            <h1 className="grand-title">
              GEN<span className="brand-heading-accent">CODE</span>
              <br />
              LEAGUE
            </h1>
            <div className="divider-blue"></div>
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
        <div className="live-page-container">
          {/* Viewer Mode Selector (Right-aligned) */}
          <div className="live-top-actions-row">
            <select
              value={myTeamId}
              onChange={(e) => setMyTeamId(e.target.value)}
              className="gcl-select-compact"
            >
              <option value="">Viewing as Guest (Select Team)</option>
              {sortedTeamsDropdown.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Personal Team Dashboard Card (Scores & Ranks completely hidden) */}
          {myTeamStats && (
            <div className="my-team-banner">
              <div className="watermark-icon">
                <Trophy size={140} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="my-team-subtitle">MY TEAM DASHBOARD</p>
                    <h2 className="my-team-name">{myTeamStats.name}</h2>
                  </div>
                </div>

                {myTeamStats.budget <= 0 ? (
                  <div className="team-budget-warning-banner">
                    <AlertTriangle size={20} className="text-red-400 animate-bounce flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-red-300">OUT OF BUDGET:</span>{' '}
                      <span className="text-slate-300">Your team has ₹0 budget remaining for this round.</span>
                    </div>
                  </div>
                ) : myTeamStats.budget <= 2000000 ? (
                  <div className="team-budget-low-banner">
                    <AlertCircle size={20} className="text-orange-400 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-orange-300">LOW BUDGET WARNING:</span>{' '}
                      <span className="text-slate-300">Your team only has {formatCurrency(myTeamStats.budget)} remaining.</span>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="stat-pill">
                    <p className="stat-pill-label">
                      <Wallet size={14} /> Budget
                    </p>
                    <p
                      className={`stat-pill-val ${
                        myTeamStats.budget < 5000000 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {formatCurrency(myTeamStats.budget)}
                    </p>
                  </div>
                  <div className="stat-pill">
                    <p className="stat-pill-label">
                      <LayoutDashboard size={14} /> Total Spent
                    </p>
                    <p className="stat-pill-val text-red-400">
                      {formatCurrency(myTeamStats.totalSpent)}
                    </p>
                  </div>
                  <div className="stat-pill">
                    <p className="stat-pill-label">
                      <Hammer size={14} /> Items Won
                    </p>
                    <p className="stat-pill-val text-white">{myTeamStats.itemsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Question / Item Box with Gold Border (Timer embedded in top-right) */}
          <div className="question-display-box">
            {/* Timer Widget inside top-right corner of Question Box */}
            <div className="question-timer-corner">
              <div className={`live-bid-timer-widget ${isExpired ? 'timer-expired' : isTimerRunning ? 'timer-running' : ''}`}>
                <div className="live-timer-label">
                  <Clock size={15} className={isTimerRunning ? 'text-cyan-400 animate-spin-slow' : 'text-slate-400'} />
                  <span>BID TIMER</span>
                </div>
                <div className={`live-timer-digits ${isExpired ? 'digits-expired' : isTimerRunning ? 'digits-running' : ''}`}>
                  {timerFormatted}
                </div>
              </div>
            </div>

            {/* Always display Round & Question Index */}
            <p className="question-header-ref">
              {currentRound.name} | Question {questionIdx + 1} of {totalQuestions}
            </p>
            <div className="divider-gold"></div>

            {isRevealed ? (
              <h3 className="question-text">
                {renderMultiLineText(eventState?.current_item_name) || 'No question text set'}
              </h3>
            ) : (
              <h3 className="question-text-awaiting">
                Awaiting for Next Question...
              </h3>
            )}
          </div>

          {/* Active Bid Pulse Banner */}
          {activeBidTeam && currentBidPreview && currentBidPreview.amount > 0 && (
            <div className="active-bid-pulse">
              <p className="active-bid-tag">
                <Zap size={18} className="text-cyan-300 animate-bounce" /> ACTIVE BID
              </p>
              <div className="grid grid-cols-3 gap-4 text-center items-center">
                <div className="border-r border-slate-700">
                  <p className="subtext-muted">Bidding Team</p>
                  <p className="val-large text-white">{activeBidTeam.name}</p>
                </div>
                <div className="border-r border-slate-700">
                  <p className="subtext-muted">Current Amount</p>
                  <p className="val-large text-green-300">
                    {formatCurrency(currentBidPreview.amount)}
                  </p>
                </div>
                <div>
                  <p className="subtext-muted">Question Ref</p>
                  <p className="val-large text-cyan-300">
                    {currentBidPreview.questionRef || `R${roundIdx + 1} - Q${questionIdx + 1}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Successful Bid Banner (Scores & Results completely hidden) */}
          {lastBidDetails && (
            <div className="last-bid-card border border-cyan-500/40 bg-slate-900/90 shadow-lg">
              <p className="last-bid-tag text-cyan-400">
                <Hammer size={16} /> LAST SUCCESSFUL BID
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center items-center">
                <div className="border-b sm:border-b-0 sm:border-r border-slate-700 pb-2 sm:pb-0">
                  <p className="subtext-muted">Winning Team</p>
                  <p className="val-medium text-white font-bold">{lastBidDetails.teamName}</p>
                </div>
                <div className="border-b sm:border-b-0 sm:border-r border-slate-700 pb-2 sm:pb-0">
                  <p className="subtext-muted">Final Bid</p>
                  <p className="val-medium text-yellow-300 font-mono">{lastBidDetails.amount}</p>
                </div>
                <div>
                  <p className="subtext-muted">Question Ref</p>
                  <p className="val-medium text-cyan-300 font-mono">{lastBidDetails.questionRef}</p>
                </div>
              </div>
            </div>
          )}          {/* Live Team Status (Strictly Budget & Spent Only - Scores Hidden from Live View) */}
          <LiveTeamStatus
            teams={teams}
            startingBudget={edition?.starting_budget || 50000000}
            myTeamId={myTeamId}
            items={items}
          />
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
          </div>

          <div className="max-w-5xl w-full mx-auto px-2">
            <div className="gcl-table-card">
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

                    const teamItems = items.filter((it) => it.team_id === (reveal?.team_id || teamObj?.id || r1Result?.id) && it.round_index === 0);
                    const r1ItemsCount = r1Result?.itemsCount ?? teamItems.length;
                    const r1Spent = r1Result?.totalSpent ?? teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
                    const r1Remaining = r1Result?.remainingBudget ?? (teamObj?.budget ?? Math.max(0, (edition?.starting_budget || 50000000) - r1Spent));

                    if (!isRevealed) {
                      return (
                        <div
                          key={position}
                          className="gcl-leaderboard-row gcl-leaderboard-unrevealed"
                        >
                          <div className="flex items-center">
                            <div className="gcl-pos-badge gcl-pos-muted opacity-60">
                              ?
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm sm:text-base font-bold text-slate-500 tracking-widest flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-600 animate-ping"></span>
                              AWAITING REVEAL
                            </span>
                          </div>
                          <div className="text-center font-mono text-slate-600 font-bold">
                            —
                          </div>
                          <div className="text-right font-mono text-slate-600">
                            —
                          </div>
                          <div className="text-right font-mono text-slate-600">
                            —
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={position}
                        className={`gcl-leaderboard-row animate-reveal-up ${
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

                        <div className="text-center">
                          <span className="badge-items-sm font-mono">
                            {r1ItemsCount} {r1ItemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <div className="text-right font-mono font-semibold text-red-400 text-sm sm:text-base">
                          {formatCurrency(r1Spent)}
                        </div>

                        <div className="text-right font-mono font-bold text-green-400 text-sm sm:text-base">
                          {formatCurrency(r1Remaining)}
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
            /* ROUND 2 INTERMISSION — PARTICIPATING TEAMS IN ALPHABETICAL ORDER ONLY */
            <div className="max-w-5xl w-full mx-auto px-4 space-y-6">
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <span className="badge-official">ROUND 2 COMPLETE</span>
                </div>
                <h1 className="intermission-title">PARTICIPATING TEAMS</h1>
                <p className="intermission-subtitle">PREPARING FOR ROUND 3 — STAND BY...</p>
              </div>

              <div className="gcl-table-card">
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
