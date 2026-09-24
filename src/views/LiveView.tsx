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

  // Parse past rounds from event_state.banner_message if stored as JSON, or derive from items
  const pastRounds: PastRoundSnapshot[] = useMemo(() => {
    if (!eventState?.banner_message) return [];
    try {
      if (eventState.banner_message.startsWith('[')) {
        return JSON.parse(eventState.banner_message);
      }
    } catch {
      // not json, return empty
    }
    return [];
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
      resultText: lastItem.is_correct ? 'Correct (+1 Pt)' : 'Wrong (0 Pt)',
    };
  }, [items, teams]);

  // Personal team stats for viewer
  const myTeamStats = useMemo(() => {
    if (!myTeamId) return null;
    const team = teamsWithStats.find((t) => t.id === myTeamId);
    if (!team) return null;

    const sorted = [...teamsWithStats].sort(
      (a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget
    );
    const rank = sorted.findIndex((t) => t.id === team.id) + 1;
    return { ...team, rank };
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
        onToggleView={() => navigate('/123456789/GCL@admin')}
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
          {/* Viewer Mode Selector */}
          <div className="mb-6 flex justify-end">
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

          {/* Personal Team Dashboard Card */}
          {myTeamStats && (
            <div className="my-team-banner">
              <div className="watermark-icon">
                <Trophy size={140} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="my-team-subtitle">MY TEAM DASHBOARD • RANK #{myTeamStats.rank}</p>
                    <h2 className="my-team-name">{myTeamStats.name}</h2>
                  </div>
                  <div className="text-right">
                    <span className="score-pill">★ {myTeamStats.score || 0} PTS</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="stat-pill">
                    <p className="stat-pill-label">Official Score</p>
                    <p className="stat-pill-val text-yellow-400 font-bold">
                      {myTeamStats.score || 0} pts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Question & Big Live Timer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 items-stretch">
            {/* Question Display Card (Left / Center) */}
            <div className="lg:col-span-8 xl:col-span-9 question-display-box flex flex-col justify-center min-h-[200px]">
              {isRevealed ? (
                <div className="w-full text-left">
                  <p className="question-header-ref">
                    {currentRound.name} | Question {questionIdx + 1} of {totalQuestions}
                  </p>
                  <div className="divider-gold"></div>
                  <h3 className="question-text">
                    {renderMultiLineText(eventState?.current_item_name) || 'No question text set'}
                  </h3>
                </div>
              ) : (
                <div className="w-full py-8 text-center flex flex-col items-center justify-center">
                  <h3 className="text-3xl md:text-5xl font-extrabold text-slate-300 tracking-wide animate-pulse">
                    Awaiting for Next Question...
                  </h3>
                  <p className="text-sm md:text-base text-yellow-500/80 mt-3 font-mono uppercase tracking-widest font-semibold">
                    Question will appear on screen when timer begins
                  </p>
                </div>
              )}
            </div>

            {/* Big Dedicated Timer Card at Right Side of Question Box */}
            <div
              className={`lg:col-span-4 xl:col-span-3 live-timer-hero-card ${
                isExpired
                  ? 'timer-expired'
                  : isTimerRunning
                  ? 'timer-running'
                  : 'timer-idle'
              }`}
            >
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-1">
                <Clock
                  size={20}
                  className={isTimerRunning ? 'text-cyan-400 animate-spin-slow' : 'text-slate-400'}
                />
                <span>BID TIMER</span>
              </div>

              <div
                className={`font-mono text-5xl md:text-6xl font-black tracking-tight my-2 ${
                  isExpired
                    ? 'text-red-500 animate-pulse'
                    : isTimerRunning
                    ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.5)]'
                    : 'text-slate-200'
                }`}
              >
                {timerFormatted}
              </div>

              <div className="mt-2">
                {isTimerRunning ? (
                  <span className="px-3.5 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    ACTIVE
                  </span>
                ) : isTimerPaused ? (
                  <span className="px-3.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    PAUSED
                  </span>
                ) : isExpired ? (
                  <span className="px-3.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    TIME UP
                  </span>
                ) : (
                  <span className="px-3.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    STANDBY
                  </span>
                )}
              </div>
            </div>
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
                <div className="col-span-2">TEAM NAME</div>
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
                          <div className="col-span-2 flex items-center gap-3">
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
          <div className="text-center animate-pulse mb-8">
            <h1 className="intermission-title">NEXT ROUND WILL START SOON</h1>
            <p className="intermission-subtitle">Stand By...</p>
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

      {/* 5. WINNER REVEAL STATE */}
      {gameState === 'winner_reveal' && (
        <div className="live-page-container">
          <div className="text-center mb-12">
            <h1 className="champions-title">CHAMPIONS</h1>
            <p className="text-xl text-slate-400 font-mono uppercase tracking-widest">
              Grand Final Standings (All Rounds)
            </p>
          </div>

          {/* Grand Champions Podium */}
          {(() => {
            const sorted = [...teamsWithStats].sort(
              (a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget
            );
            const first = sorted[0];
            const second = sorted[1];
            const third = sorted[2];

            return (
              <div className="podium-wrapper">
                {second && (
                  <div className="podium-col order-2 md:order-1">
                    <div className="podium-badge mb-4">
                      <Medal size={48} className="text-slate-300 mx-auto mb-2" />
                      <h2 className="text-2xl font-bold text-slate-200">{second.name}</h2>
                      <p className="text-lg font-mono text-slate-400">{second.score || 0} pts</p>
                    </div>
                    <div className="podium-step podium-silver">
                      <span className="podium-number">2</span>
                    </div>
                  </div>
                )}
                {first && (
                  <div className="podium-col order-1 md:order-2 scale-105 z-20">
                    <div className="podium-badge mb-6">
                      <Crown size={64} className="text-yellow-400 mx-auto mb-2 animate-bounce" />
                      <h2 className="text-3xl md:text-4xl font-black text-yellow-100">
                        {first.name}
                      </h2>
                      <p className="text-2xl font-mono text-yellow-400 font-bold">
                        {first.score || 0} pts
                      </p>
                    </div>
                    <div className="podium-step podium-gold">
                      <span className="podium-number">1</span>
                    </div>
                  </div>
                )}
                {third && (
                  <div className="podium-col order-3">
                    <div className="podium-badge mb-4">
                      <Medal size={48} className="text-orange-400 mx-auto mb-2" />
                      <h2 className="text-2xl font-bold text-orange-100">{third.name}</h2>
                      <p className="text-lg font-mono text-orange-200">{third.score || 0} pts</p>
                    </div>
                    <div className="podium-step podium-bronze">
                      <span className="podium-number">3</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Grand Cumulative Table */}
          <div className="mt-16">
            <h2 className="section-title-large">Grand Cumulative Scoreboard</h2>
            <div className="scoreboard-container">
              <div className="scoreboard-header-5col">
                <div className="col-span-2">TEAM NAME</div>
                <div className="text-right text-yellow-400">TOTAL SCORE</div>
                <div className="text-right">ITEMS WON</div>
                <div className="text-right">TOTAL SPENT</div>
                <div className="text-right">REMAINING</div>
              </div>
              <div className="space-y-3">
                {[...teamsWithStats]
                  .sort((a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget)
                  .map((team, idx) => {
                    const isFirst = idx === 0;
                    const isMe = team.id === myTeamId;
                    return (
                      <div
                        key={team.id}
                        className={`team-row-5col ${
                          isFirst ? 'row-champion' : isMe ? 'team-row-me' : 'team-row-default'
                        }`}
                      >
                        <div className="col-span-2 flex items-center gap-3">
                          <span
                            className={`font-black text-2xl ${
                              idx === 0
                                ? 'text-yellow-400'
                                : idx === 1
                                ? 'text-slate-300'
                                : idx === 2
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="text-xl font-bold text-white">
                              {team.name}
                              {isMe && <span className="badge-you">YOU</span>}
                            </p>
                            {isFirst && <span className="badge-champion">GRAND CHAMPION</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-yellow-400">
                            {team.score || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-indigo-300">{team.itemsCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-red-400">
                            {formatCurrency(team.totalSpent)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-green-400">
                            {formatCurrency(team.budget)}
                          </p>
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
