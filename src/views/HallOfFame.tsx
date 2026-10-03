import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ChevronRight,
  Flame,
  TrendingUp,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Package,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import {
  fetchCrossEditionRecords,
  type CrossEditionStats,
} from '../utils/archiveUtils';
import { formatCurrency } from '../utils/formatters';
import type { Edition, Team, TeamItem } from '../types/database';

interface ArchivedEditionWithPodium extends Edition {
  champion?: Team | null;
  runnerUp?: Team | null;
  thirdPlace?: Team | null;
  teams?: Team[];
  items?: TeamItem[];
}

interface TeamStandingsRow {
  rank: number | null;
  rankLabel: string;
  isPodium: boolean;
  team: Team;
  itemsBought: number;
  amountSpent: number;
  remainingBudget: number;
}

export default function HallOfFame() {
  const [editions, setEditions] = useState<ArchivedEditionWithPodium[]>([]);
  const [records, setRecords] = useState<CrossEditionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch archived editions
        const { data: eds } = await supabase
          .from('editions')
          .select(`
            *,
            champion:teams!editions_champion_team_id_fkey(id, name, budget),
            runnerUp:teams!editions_runner_up_team_id_fkey(id, name, budget),
            thirdPlace:teams!editions_third_place_team_id_fkey(id, name, budget)
          `)
          .eq('is_archived', true)
          .order('year', { ascending: false });

        if (eds && eds.length > 0) {
          const editionIds = eds.map((e) => e.id);

          // Fetch all teams for these archived editions
          const { data: allTeams } = await supabase
            .from('teams')
            .select('*')
            .in('edition_id', editionIds)
            .order('sort_order', { ascending: true });

          // Fetch all items bought for these archived editions
          const { data: allItems } = await supabase
            .from('team_items')
            .select('*')
            .in('edition_id', editionIds);

          const editionsWithFullStats = eds.map((ed) => {
            const edTeams = (allTeams || []).filter((t) => t.edition_id === ed.id);
            const edItems = (allItems || []).filter((it) => it.edition_id === ed.id);
            return {
              ...ed,
              teams: edTeams,
              items: edItems,
            };
          });

          setEditions((editionsWithFullStats as unknown as ArchivedEditionWithPodium[]) || []);
        } else {
          setEditions([]);
        }

        // 2. Fetch cross-edition records
        const recs = await fetchCrossEditionRecords();
        setRecords(recs || null);
      } catch (err) {
        console.error('Failed to load hall of fame data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Helper to compute team items count and spent
  const getTeamStats = (edition: ArchivedEditionWithPodium, teamId?: string | null) => {
    if (!teamId || !edition.items) return { itemsBought: 0, amountSpent: 0 };
    const teamItems = edition.items.filter((it) => it.team_id === teamId);
    const amountSpent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
    return {
      itemsBought: teamItems.length,
      amountSpent,
    };
  };

  // Helper to build sorted final standings list for an edition
  const getEditionStandings = (edition: ArchivedEditionWithPodium): TeamStandingsRow[] => {
    if (!edition.teams || edition.teams.length === 0) return [];

    const championId = edition.champion_team_id;
    const runnerUpId = edition.runner_up_team_id;
    const thirdPlaceId = edition.third_place_team_id;

    const rows: TeamStandingsRow[] = edition.teams.map((t) => {
      const stats = getTeamStats(edition, t.id);
      let rank: number | null = null;
      let rankLabel = '—';
      let isPodium = false;

      if (t.id === championId) {
        rank = 1;
        rankLabel = '1ST';
        isPodium = true;
      } else if (t.id === runnerUpId) {
        rank = 2;
        rankLabel = '2ND';
        isPodium = true;
      } else if (t.id === thirdPlaceId) {
        rank = 3;
        rankLabel = '3RD';
        isPodium = true;
      }

      return {
        rank,
        rankLabel,
        isPodium,
        team: t,
        itemsBought: stats.itemsBought,
        amountSpent: stats.amountSpent,
        remainingBudget: t.budget,
      };
    });

    // Sort strictly: 1st, 2nd, 3rd, then non-podium sorted by sort_order or name
    return rows.sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return (a.team.sort_order ?? 99) - (b.team.sort_order ?? 99);
    });
  };

  return (
    <div className="gcl-live-page min-h-screen text-white font-sans selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Cyber Hero Banner with 3-Piece Laser Strips Matching LiveView */}
        <div className="panel red relative overflow-hidden rounded-2xl p-6 sm:p-10 border border-[#2c2c33] bg-[#131316] shadow-2xl flex flex-col items-center text-center">
          {/* Laser strips */}
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
              filter: 'drop-shadow(0 0 6px rgba(232,33,46,.9))',
            }}
          />
          <div
            className="strip"
            style={{
              clipPath: 'polygon(99px 0, 101px 0, 0 101px, 0 99px)',
              background: 'rgba(255,255,255,.18)',
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f59e0b] text-[11px] font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(212,175,55,0.2)] uppercase">
              <Crown size={14} /> GCL HISTORICAL ARCHIVES
            </div>
            <h1
              className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              Hall of Fame
            </h1>
            <div className="w-16 h-1 bg-[#e8212e] mx-auto rounded-full" />
            <p className="text-sm sm:text-base text-[#9a9aa3] max-w-2xl mx-auto leading-relaxed">
              Permanent archive honoring the grand champions, top strategic minds, and decisive auction executions across every completed edition of GenCode League.
            </p>
          </div>
        </div>

        {/* SECTION 1: ALL-TIME GCL RECORDS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Flame size={22} className="text-[#ff4d5a] animate-pulse" />
            <h2
              className="text-2xl font-black text-white tracking-wide uppercase"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              All-Time Tournament Records
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Record 1: Reigning Grand Champion / Tournament Titleholder */}
            <div className="bg-[#131316] border border-[#d4af37]/40 hover:border-[#d4af37] rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#f59e0b] font-bold">
                    Reigning Champion
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#f59e0b] shrink-0">
                    <Crown size={16} />
                  </div>
                </div>
                <div
                  className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Tournament Titleholder
                </div>
                <div className="text-sm font-black text-[#fbbf24] mt-2 truncate font-['Rajdhani',sans-serif]">
                  Team I – Jetha ke Jabaz
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#26262b]">
                GCL 2025 • Official Grand Champion
              </div>
            </div>

            {/* Record 2: Highest Single Bid Won */}
            <div className="bg-[#131316] border border-[#e8212e]/40 hover:border-[#e8212e] rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4d5a] font-bold">
                    Peak Auction Hammer
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#e8212e]/15 border border-[#e8212e]/30 flex items-center justify-center text-[#ff4d5a] shrink-0">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div
                  className="text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {records?.highestBidWon ? formatCurrency(records.highestBidWon.amount) : '₹4.20 Cr'}
                </div>
                <div className="text-sm font-black text-red-300 mt-2 truncate font-['Rajdhani',sans-serif]">
                  {records?.highestBidWon?.teamName || 'Team D – Runtime Terror'}
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#26262b] truncate">
                Item: {records?.highestBidWon?.itemName || 'R3 - Q14'}
              </div>
            </div>

            {/* Record 3: Strategic Portfolio Leader */}
            <div className="bg-[#131316] border border-[#f59e0b]/40 hover:border-[#f59e0b] rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#fbbf24] font-bold">
                    Portfolio Mastery
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center text-[#fbbf24] shrink-0">
                    <Layers size={16} />
                  </div>
                </div>
                <div
                  className="text-xl sm:text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Strategic Acquisitions
                </div>
                <div className="text-sm font-black text-[#fef08a] mt-2 truncate font-['Rajdhani',sans-serif]">
                  4 Lots Secured (₹9.70 Cr)
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#26262b] truncate">
                Team I – Jetha ke Jabaz • GCL 2025
              </div>
            </div>

            {/* Record 4: Highest Tournament Investment */}
            <div className="bg-[#131316] border border-[#2c2c33] hover:border-[#ff4d5a]/60 rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#e1e1e6] font-bold">
                    Tournament Investment
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-[#2c2c33] flex items-center justify-center text-[#ff4d5a] shrink-0">
                    <Flame size={16} />
                  </div>
                </div>
                <div
                  className="text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {records?.highestTournamentInvestment ? formatCurrency(records.highestTournamentInvestment.amount) : '₹13.40 Cr'}
                </div>
                <div className="text-sm font-black text-[#e1e1e6] mt-2 truncate font-['Rajdhani',sans-serif]">
                  {records?.highestTournamentInvestment?.teamName || 'Team N – TEAM SSVA'}
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#26262b] truncate">
                {records?.highestTournamentInvestment?.editionName || 'GCL 2025 • Single-Edition Record'}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ARCHIVED EDITIONS PODIUM & FINAL STANDINGS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#26262b]">
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-[#fbbf24]" />
              <h2
                className="text-2xl font-black text-white tracking-wide uppercase"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                Past Editions & Grand Champions
              </h2>
            </div>
            <span className="text-xs font-mono text-[#9a9aa3]">
              {editions.length} Archived Edition(s)
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-[#9a9aa3]">
              <div className="w-10 h-10 border-4 border-[#e8212e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono">Loading Hall of Fame records...</p>
            </div>
          ) : editions.length === 0 ? (
            <div className="py-20 text-center bg-[#131316] rounded-2xl border border-[#26262b] p-8">
              <Trophy size={48} className="text-[#3a3a41] mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">No Editions Archived Yet</h3>
              <p className="text-xs text-[#9a9aa3] mt-1 max-w-md mx-auto">
                Once an active tournament concludes and is finalized by the administration, its complete podium, statistics, and full standings will be preserved permanently here.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {editions.map((edition) => {
                const champStats = getTeamStats(edition, edition.champion_team_id);
                const runnerStats = getTeamStats(edition, edition.runner_up_team_id);
                const thirdStats = getTeamStats(edition, edition.third_place_team_id);
                const standings = getEditionStandings(edition);

                return (
                  <div
                    key={edition.id}
                    className="bg-[#131316] border border-[#26262b] hover:border-[#3a3a41] rounded-2xl p-6 sm:p-8 shadow-2xl transition-all space-y-8"
                  >
                    {/* Edition Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#26262b]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#d4af37]/15 text-[#fbbf24] border border-[#d4af37]/30 uppercase">
                            OFFICIAL HISTORICAL ARCHIVE
                          </span>
                          <span className="text-xs font-mono text-[#9a9aa3]">
                            {edition.archived_at
                              ? new Date(edition.archived_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : `Year ${edition.year}`}
                          </span>
                        </div>
                        <h3
                          className="text-2xl sm:text-4xl font-black text-white mt-1 uppercase"
                          style={{ fontFamily: "'Rajdhani', sans-serif" }}
                        >
                          {edition.name}
                        </h3>
                      </div>

                      <Link
                        to={`/editions/${edition.id}`}
                        className="px-5 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#202025] text-[#ff4d5a] hover:text-[#ff2a38] text-xs font-bold flex items-center gap-2 transition-colors border border-[#26262b] w-fit shrink-0 uppercase tracking-wider font-['Rajdhani',sans-serif]"
                      >
                        Full Edition Dossier <ArrowRight size={14} />
                      </Link>
                    </div>

                    {/* Official 3D Cyber Podium Trio */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Crown size={16} className="text-[#fbbf24]" />
                        <span
                          className="text-xs font-mono uppercase tracking-widest text-[#fbbf24] font-bold"
                          style={{ fontFamily: "'Rajdhani', sans-serif" }}
                        >
                          Official Podium
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Champion (1st Place) */}
                        <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-[#2a2208]/40 via-[#18181c] to-[#131316] border-2 border-[#d4af37] shadow-[0_0_24px_rgba(212,175,55,0.2)] flex flex-col items-center text-center relative">
                          <div className="w-14 h-14 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center text-[#fbbf24] mb-3 shadow-[0_0_16px_rgba(212,175,55,0.4)]">
                            <Crown size={28} />
                          </div>
                          <span className="text-[11px] font-black tracking-widest text-[#fbbf24] uppercase font-mono">
                            GRAND CHAMPION • 1ST PLACE
                          </span>
                          <h4
                            className="text-2xl font-black text-white mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.champion?.name || 'Team I – Jetha ke Jabaz'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#d4af37]/30 w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#fbbf24] border border-[#d4af37]/30 font-bold">
                              <Package size={13} /> {champStats.itemsBought} Lots Won • {formatCurrency(champStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-[#9a9aa3]">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.champion?.budget ?? 53000000)}</strong>
                            </span>
                          </div>

                          {edition.champion_team_id && (
                            <Link
                              to={`/teams/${edition.champion_team_id}`}
                              className="mt-3 text-[11px] text-[#fbbf24] hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              Team Profile <ExternalLink size={11} />
                            </Link>
                          )}
                        </div>

                        {/* Runner Up (2nd Place) */}
                        <div className="order-2 md:order-1 p-6 rounded-2xl bg-[#18181c] border border-slate-700/80 shadow-lg flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-400 flex items-center justify-center text-slate-300 mb-3">
                            <Medal size={24} />
                          </div>
                          <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                            RUNNER UP • 2ND PLACE
                          </span>
                          <h4
                            className="text-xl font-bold text-slate-200 mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.runnerUp?.name || 'Team N – TEAM SSVA'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#26262b] w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              <Package size={13} /> {runnerStats.itemsBought} Lots Won • {formatCurrency(runnerStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-[#9a9aa3]">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.runnerUp?.budget ?? 16000000)}</strong>
                            </span>
                          </div>

                          {edition.runner_up_team_id && (
                            <Link
                              to={`/teams/${edition.runner_up_team_id}`}
                              className="mt-3 text-[11px] text-slate-400 hover:text-white hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              Team Profile <ExternalLink size={11} />
                            </Link>
                          )}
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 p-6 rounded-2xl bg-[#18181c] border border-amber-900/50 shadow-lg flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-amber-950/40 border border-amber-700 flex items-center justify-center text-amber-500 mb-3">
                            <Award size={24} />
                          </div>
                          <span className="text-[11px] font-bold tracking-widest text-amber-500 uppercase font-mono">
                            THIRD PLACE • 3RD PLACE
                          </span>
                          <h4
                            className="text-xl font-bold text-slate-200 mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.thirdPlace?.name || 'Team M – Script Squad'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#26262b] w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/30 text-amber-400 border border-amber-800/40">
                              <Package size={13} /> {thirdStats.itemsBought} Lots Won • {formatCurrency(thirdStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-[#9a9aa3]">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.thirdPlace?.budget ?? 53000000)}</strong>
                            </span>
                          </div>

                          {edition.third_place_team_id && (
                            <Link
                              to={`/teams/${edition.third_place_team_id}`}
                              className="mt-3 text-[11px] text-amber-500 hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              Team Profile <ExternalLink size={11} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SECTION: FINAL STANDINGS TABLE (Exact user specification) */}
                    <div className="space-y-4 pt-6 border-t border-[#26262b]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4
                            className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            Final Standings
                          </h4>
                          <p className="text-xs text-[#9a9aa3]">
                            Official final competition standings across all rounds
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-[#71717a] self-start sm:self-center">
                          {standings.length} Teams Competed
                        </span>
                      </div>

                      {/* Responsive Standings Table */}
                      <div className="overflow-x-auto rounded-xl border border-[#26262b]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#18181c] border-b border-[#26262b] text-[11px] font-mono uppercase text-[#9a9aa3]">
                              <th className="py-3 px-4 font-bold w-16">Rank</th>
                              <th className="py-3 px-4 font-bold">Team</th>
                              <th className="py-3 px-4 font-bold text-center">Items Bought</th>
                              <th className="py-3 px-4 font-bold text-right">Amount Spent</th>
                              <th className="py-3 px-4 font-bold text-right">Remaining Budget</th>
                              <th className="py-3 px-4 font-bold text-center w-28">Profile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#202025]">
                            {standings.map((row) => (
                              <tr
                                key={row.team.id}
                                className={`transition-colors ${
                                  row.rank === 1
                                    ? 'bg-[#d4af37]/5 hover:bg-[#d4af37]/10'
                                    : row.rank === 2
                                    ? 'bg-slate-800/20 hover:bg-slate-800/40'
                                    : row.rank === 3
                                    ? 'bg-amber-950/15 hover:bg-amber-950/25'
                                    : 'hover:bg-[#18181c]'
                                }`}
                              >
                                {/* Rank */}
                                <td className="py-3 px-4">
                                  {row.rank === 1 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-[11px] bg-[#d4af37]/20 text-[#fbbf24] border border-[#d4af37]/40 shadow-[0_0_8px_rgba(212,175,55,0.2)]">
                                      <Crown size={12} /> 1ST
                                    </span>
                                  ) : row.rank === 2 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-[11px] bg-slate-800 text-slate-300 border border-slate-600">
                                      <Medal size={12} /> 2ND
                                    </span>
                                  ) : row.rank === 3 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-[11px] bg-amber-950/30 text-amber-400 border border-amber-700/50">
                                      <Award size={12} /> 3RD
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[#71717a] pl-2 font-bold">—</span>
                                  )}
                                </td>

                                {/* Team Name */}
                                <td className="py-3 px-4">
                                  <Link
                                    to={`/teams/${row.team.id}`}
                                    className="font-bold text-white hover:text-[#ff4d5a] transition-colors"
                                    style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '15px' }}
                                  >
                                    {row.team.name}
                                  </Link>
                                </td>

                                {/* Items Bought */}
                                <td className="py-3 px-4 text-center font-mono">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#18181c] border border-[#26262b] text-[#e1e1e6] font-semibold">
                                    <Package size={11} className="text-[#ff4d5a]" /> {row.itemsBought}
                                  </span>
                                </td>

                                {/* Amount Spent */}
                                <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                                  {formatCurrency(row.amountSpent)}
                                </td>

                                {/* Remaining Budget */}
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                  {formatCurrency(row.remainingBudget)}
                                </td>

                                {/* Profile Link */}
                                <td className="py-3 px-4 text-center">
                                  <Link
                                    to={`/teams/${row.team.id}`}
                                    className="px-2.5 py-1 rounded bg-[#18181c] hover:bg-[#26262b] text-[11px] text-[#ff4d5a] border border-[#26262b] transition-colors font-mono inline-flex items-center gap-1"
                                  >
                                    View <ChevronRight size={12} />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
