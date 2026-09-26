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
  Crown,
  Clock,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTeamItems } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import Header from '../components/Header';
import ConnectionHealth from '../components/ConnectionHealth';
import LiveTeamStatus from '../components/LiveTeamStatus';
import { formatCurrency, renderMultiLineText } from '../utils/formatters';
import { DEFAULT_ROUNDS_DATA } from '../data/roundsData';
import type { PastRoundSnapshot } from '../types/database';

export default function LiveView() {
  const navigate = useNavigate();
  const { eventState, edition, loading: stateLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const { items } = useTeamItems(edition?.id);
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
  const { pastRounds, podiumState } = useMemo(() => {
    let past: PastRoundSnapshot[] = [];
    let podium = {
      thirdTeamId: null as string | null,
      thirdRevealed: false,
      secondTeamId: null as string | null,
      secondRevealed: false,
      firstTeamId: null as string | null,
      firstRevealed: false,
    };

    if (!eventState?.banner_message) return { pastRounds: past, podiumState: podium };
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
      }
    } catch {
      // not json, return defaults
    }
    return { pastRounds: past, podiumState: podium };
  }, [eventState?.banner_message]);

  const currentRoundIndex = eventState?.current_round_index ?? 0;

  // Current Round Stats for LiveView
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
    }).sort((a, b) => {
      if (b.roundScore !== a.roundScore) return b.roundScore - a.roundScore;
      if (b.roundItemsCount !== a.roundItemsCount) return b.roundItemsCount - a.roundItemsCount;
      return b.remainingBudget - a.remainingBudget;
    });
  }, [teams, items, currentRoundIndex]);

  // Overall Stats across ALL rounds combined (Point 5: matching winner 2025 2.png)
  const overallStats = useMemo(() => {
    const standardBudget = edition?.starting_budget || 50000000;
    const roundsCount = Math.max(1, currentRoundIndex + 1);

    return teams.map((team) => {
      const allTeamItems = items.filter((it) => it.team_id === team.id);
      const totalScore = team.score || 0;
      const totalItems = allTeamItems.length;
      const totalSpent = allTeamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const totalAllocated = roundsCount * standardBudget;
      const totalRemaining = Math.max(0, totalAllocated - totalSpent);

      return {
        ...team,
        totalScore,
        totalItems,
        totalSpent,
        totalRemaining,
      };
    }).sort((a, b) => {
      // 1. Highest total score
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      // 2. Highest total items
      if (b.totalItems !== a.totalItems) return b.totalItems - a.totalItems;
      // 3. Highest total remaining budget
      return b.totalRemaining - a.totalRemaining;
    });
  }, [teams, items, edition?.starting_budget, currentRoundIndex]);

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
                {teams.map((t) => (
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
              {teams.map((t) => (
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
          )}

          {/* Live Team Status (Strictly Budget & Spent Only - Scores Hidden from Live View) */}
          <LiveTeamStatus
            teams={teams}
            startingBudget={edition?.starting_budget || 50000000}
            myTeamId={myTeamId}
          />
        </div>
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="live-centered-screen">
          <div className="text-center mb-8">
            <h1 className="intermission-title">
              {isAfterRound3 ? 'RESULTS WILL BE ANNOUNCED SOON' : 'NEXT ROUND WILL START SOON'}
            </h1>
            <p className="intermission-subtitle">STAND BY...</p>
            <div className="intermission-warning-banner">
              ⚠️ BUDGETS ARE RESETTING ⚠️
            </div>
          </div>
          {pastRounds.length > 0 && (
            <div className="max-w-4xl w-full mx-auto px-2">
              <div className="gcl-table-container">
                <h2 className="text-xl md:text-2xl font-bold text-center text-white mb-6 uppercase tracking-wider flex items-center justify-center gap-3">
                  <History className="text-yellow-400 shrink-0" size={24} />
                  <span>{pastRounds[pastRounds.length - 1].roundName} Summary</span>
                </h2>

                <div className="grid-live-status-header">
                  <div>TEAM</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right">REM. BUDGET</div>
                </div>

                <div className="space-y-1">
                  {pastRounds[pastRounds.length - 1].results.map((res, i) => (
                    <div
                      key={res.id || i}
                      className={`grid-live-status-row ${res.id === myTeamId ? 'grid-live-status-me' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-bold text-white text-base md:text-lg truncate">
                          {res.name}
                        </span>
                        {res.id === myTeamId && <span className="badge-you-inline">YOU</span>}
                      </div>
                      <div className="text-right font-mono font-semibold text-red-400 text-base md:text-lg">
                        {formatCurrency(res.totalSpent)}
                      </div>
                      <div className="text-right font-mono font-bold text-green-400 text-base md:text-lg">
                        {formatCurrency(res.remainingBudget)}
                      </div>
                    </div>
                  ))}
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
            const secondTeam = teams.find((t) => t.id === podiumState.secondTeamId);
            const thirdTeam = teams.find((t) => t.id === podiumState.thirdTeamId);

            return (
              <div className="podium-wrapper">
                {/* 2nd Place Pedestal (Left) */}
                <div className="podium-col order-2 md:order-1">
                  <div className="podium-badge mb-4">
                    {podiumState.secondRevealed && secondTeam ? (
                      <div className="animate-reveal-up">
                        <Medal size={56} className="text-slate-300 mx-auto mb-2" />
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">{secondTeam.name}</h2>
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
                    {podiumState.firstRevealed && firstTeam ? (
                      <div className="animate-reveal-up">
                        <Crown size={72} className="text-yellow-400 mx-auto mb-2 animate-bounce" />
                        <h2 className="text-3xl md:text-4xl font-black text-yellow-300">{firstTeam.name}</h2>
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
                <div className="podium-col order-3">
                  <div className="podium-badge mb-4">
                    {podiumState.thirdRevealed && thirdTeam ? (
                      <div className="animate-reveal-up">
                        <Medal size={56} className="text-orange-400 mx-auto mb-2" />
                        <h2 className="text-2xl md:text-3xl font-extrabold text-orange-200">{thirdTeam.name}</h2>
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

          {/* Grand Champion Final Scoreboard (All Rounds Combined - Matching winner 2025 2.png) */}
          <div className="max-w-5xl w-full mx-auto mt-12 px-2">
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <Crown size={28} className="text-yellow-400 shrink-0" />
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide text-center">
                Final Championship Standings
              </h2>
            </div>
            <div className="gcl-table-container">
              {/* Header row */}
              <div className="grid-overall-header">
                <div>TEAM NAME</div>
                <div className="text-center text-yellow-400 font-black">TOTAL SCORE</div>
                <div className="text-center">TOTAL ITEMS</div>
                <div className="text-right">TOTAL SPENT</div>
                <div className="text-right">TOTAL REM.</div>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {overallStats.map((team, idx) => {
                  const isGrandChampion = idx === 0 && team.totalScore > 0;
                  const isOutOfBudget = team.totalRemaining <= 0;
                  const isMyTeam = team.id === myTeamId;

                  return (
                    <div
                      key={team.id}
                      className={`grid-overall-row ${
                        isGrandChampion
                          ? 'gcl-row-champion'
                          : isMyTeam
                          ? 'grid-live-status-me'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className={`font-mono font-bold text-lg ${
                            isGrandChampion ? 'text-yellow-400' : 'text-blue-400'
                          }`}
                        >
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base md:text-lg truncate">
                              {team.name}
                            </span>
                            {isMyTeam && <span className="badge-you-inline">YOU</span>}
                            {isOutOfBudget && (
                              <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                            )}
                          </div>
                          {isGrandChampion && (
                            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block mt-0.5">
                              GRAND CHAMPION
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-center font-black text-yellow-400 text-2xl font-mono">
                        {team.totalScore}
                      </div>

                      <div className="text-center font-semibold text-slate-200 text-lg font-mono">
                        {team.totalItems}
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
