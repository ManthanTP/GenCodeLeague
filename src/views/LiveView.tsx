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
} from 'lucide-react';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTeamItems } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import Header from '../components/Header';
import ConnectionHealth from '../components/ConnectionHealth';
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

  // Last successful bid derived from team_items
  const lastBidDetails = useMemo(() => {
    if (!items || items.length === 0) return null;
    const lastItem = items[0]; // sorted by created_at desc
    const team = teams.find((t) => t.id === lastItem.team_id);
    return {
      teamName: team?.name || 'Unknown Team',
      questionRef: lastItem.question_ref || `R${lastItem.round_index + 1} - Q${lastItem.question_index + 1}`,
      amount: formatCurrency(lastItem.cost),
      status: lastItem.is_correct ? 'correct' : 'wrong',
      resultText: lastItem.is_correct ? 'Correct' : 'Incorrect',
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
    <div className="min-h-screen bg-slate-950 text-white pb-16 font-sans">
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
            <h1 className="text-6xl md:text-7xl font-black text-slate-400 tracking-tighter">
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
              GEN<span className="text-blue-500">CODE</span>
              <br />
              LEAGUE
            </h1>
            <div className="divider-blue"></div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white uppercase tracking-widest animate-bounce">
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

          {/* Last Successful Bid Banner */}
          {lastBidDetails && (
            <div
              className={`last-bid-card ${
                lastBidDetails.status === 'correct'
                  ? 'border-green-500/50'
                  : 'border-red-500/50'
              }`}
            >
              <p
                className={`last-bid-tag ${
                  lastBidDetails.status === 'correct' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <Hammer size={16} /> LAST SUCCESSFUL BID
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center items-center">
                <div className="border-r border-slate-700">
                  <p className="subtext-muted">Winning Team</p>
                  <p className="val-medium text-white">{lastBidDetails.teamName}</p>
                </div>
                <div className="border-r border-slate-700">
                  <p className="subtext-muted">Final Bid</p>
                  <p className="val-medium text-yellow-300">{lastBidDetails.amount}</p>
                </div>
                <div className="border-r border-slate-700">
                  <p className="subtext-muted">Question Ref</p>
                  <p className="val-medium text-cyan-300">{lastBidDetails.questionRef}</p>
                </div>
                <div>
                  <p className="subtext-muted">Result</p>
                  <p
                    className={`val-medium font-bold ${
                      lastBidDetails.status === 'correct' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {lastBidDetails.resultText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Team Status Table */}
          <div className="mt-8">
            <h2 className="section-title-large">Live Team Status</h2>
            <div className="scoreboard-container">
              <div className="scoreboard-header">
                <div>TEAM NAME</div>
                <div className="text-right">TOTAL SPENT</div>
                <div className="text-right">REMAINING</div>
              </div>
              <div className="space-y-3">
                {teamsWithStats.length > 0 ? (
                  [...teamsWithStats]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((team) => {
                      const isMyTeam = team.id === myTeamId;
                      return (
                        <div
                          key={team.id}
                          className={`team-row ${
                            isMyTeam ? 'team-row-me' : 'team-row-default'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="team-row-name">
                              {team.name}
                              {isMyTeam && <span className="badge-you">YOU</span>}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-red-400 text-lg">
                              {formatCurrency(team.totalSpent)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-2xl font-black ${
                                team.budget > 0 ? 'text-green-400' : 'text-red-500'
                              }`}
                            >
                              {formatCurrency(team.budget)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="empty-notice">
                    No teams are currently participating. Please add teams in the Admin Console.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completed Round Summaries */}
          {pastRounds.length > 0 && (
            <div className="mt-12">
              <h2 className="section-title-muted">
                <History size={24} /> Completed Round Summaries
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {pastRounds.map((round, rIdx) => (
                  <div key={rIdx} className="round-summary-card">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-bold text-indigo-400">{round.roundName}</h3>
                      <span className="text-slate-500 text-sm">
                        {new Date(round.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400 text-sm">
                            <th className="p-3">Team</th>
                            <th className="p-3 text-right">Total Spent</th>
                            <th className="p-3 text-right">Remaining Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...round.results]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((res, i) => (
                              <tr
                                key={i}
                                className={`border-b border-slate-800 ${
                                  res.id === myTeamId ? 'bg-indigo-900/30' : ''
                                }`}
                              >
                                <td className="p-3 font-bold text-white">
                                  {res.name}
                                  {res.id === myTeamId && (
                                    <span className="badge-you-inline">YOU</span>
                                  )}
                                </td>
                                <td className="p-3 text-right text-red-400">
                                  {formatCurrency(res.totalSpent)}
                                </td>
                                <td className="p-3 text-right text-green-400 font-bold">
                                  {formatCurrency(res.remainingBudget)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="live-centered-screen">
          <div className="text-center mb-8">
            <h1 className="intermission-title">
              {roundIdx >= 2 ? 'RESULTS WILL BE ANNOUNCED SOON' : 'NEXT ROUND WILL START SOON'}
            </h1>
            <p className="intermission-subtitle">STAND BY...</p>
            <div className="intermission-warning-banner">
              ⚠️ BUDGETS ARE RESETTING ⚠️
            </div>
          </div>
          {pastRounds.length > 0 && (
            <div className="max-w-4xl w-full mx-auto round-summary-card">
              <h2 className="text-2xl font-bold text-center text-white mb-6 uppercase tracking-wider flex items-center justify-center gap-3">
                <History className="text-yellow-400" size={28} />{' '}
                {pastRounds[pastRounds.length - 1].roundName} Summary
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-700">
                <table className="w-full text-left">
                  <thead className="bg-slate-900">
                    <tr className="text-slate-300 uppercase text-xs">
                      <th className="p-4">Team</th>
                      <th className="p-4 text-right">Total Spent</th>
                      <th className="p-4 text-right">Rem. Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pastRounds[pastRounds.length - 1].results.map((res, i) => (
                      <tr
                        key={i}
                        className={res.id === myTeamId ? 'bg-indigo-900/40' : 'hover:bg-slate-800/40'}
                      >
                        <td className="p-4 font-bold text-lg text-white">
                          {res.name}
                          {res.id === myTeamId && <span className="badge-you-inline">YOU</span>}
                        </td>
                        <td className="p-4 text-right text-red-400 font-semibold">
                          {formatCurrency(res.totalSpent)}
                        </td>
                        <td className="p-4 text-right text-green-400 font-bold">
                          {formatCurrency(res.remainingBudget)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <p className="text-xl text-slate-400 font-mono uppercase tracking-widest">
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
        </div>
      )}
    </div>
  );
}
