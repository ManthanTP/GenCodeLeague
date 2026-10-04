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
        rankLabel = '01';
        isPodium = true;
      } else if (t.id === runnerUpId) {
        rank = 2;
        rankLabel = '02';
        isPodium = true;
      } else if (t.id === thirdPlaceId) {
        rank = 3;
        rankLabel = '03';
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

    // Sort strictly: 1st, 2nd, 3rd, then non-podium sorted by sort_order
    return rows.sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return (a.team.sort_order ?? 99) - (b.team.sort_order ?? 99);
    });
  };

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        {/* Cyber Hero Banner (No laser strip, pure opposite-corner red glow) */}
        <div className="panel red relative overflow-hidden rounded-2xl p-6 sm:p-10 flex flex-col items-center text-center">
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
            <p className="text-sm sm:text-base text-[#9a9aa3] max-w-2xl mx-auto leading-relaxed font-sans">
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
            <div className="panel red p-5 flex flex-col justify-between">
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
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#3a3a44]">
                GCL 2025 • Official Grand Champion
              </div>
            </div>

            {/* Record 2: Highest Single Bid Won */}
            <div className="panel red p-5 flex flex-col justify-between">
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
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#3a3a44] truncate">
                Item: {records?.highestBidWon?.itemName || 'R3 - Q14'}
              </div>
            </div>

            {/* Record 3: Strategic Portfolio Leader */}
            <div className="panel red p-5 flex flex-col justify-between">
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
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#3a3a44] truncate">
                Team I – Jetha ke Jabaz • GCL 2025
              </div>
            </div>

            {/* Record 4: Highest Tournament Investment */}
            <div className="panel red p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4d5a] font-bold">
                    Tournament Investment
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#e8212e]/15 border border-[#e8212e]/30 flex items-center justify-center text-[#ff4d5a] shrink-0">
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
              <div className="text-[11px] font-mono text-[#9a9aa3] mt-3 pt-2 border-t border-[#3a3a44] truncate">
                {records?.highestTournamentInvestment?.editionName || 'GCL 2025 • Single-Edition Record'}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ARCHIVED EDITIONS PODIUM & FINAL STANDINGS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#35353b]">
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
            <div className="py-20 text-center panel red p-8">
              <Trophy size={48} className="text-[#3a3a41] mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">No Editions Archived Yet</h3>
              <p className="text-xs text-[#9a9aa3] mt-1 max-w-md mx-auto">
                Once an active tournament concludes and is finalized by the administration, its complete podium, statistics, and full standings will be preserved permanently here.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {editions.map((edition) => {
                const champStats = getTeamStats(edition, edition.champion_team_id);
                const runnerStats = getTeamStats(edition, edition.runner_up_team_id);
                const thirdStats = getTeamStats(edition, edition.third_place_team_id);
                const standings = getEditionStandings(edition);

                return (
                  <div
                    key={edition.id}
                    className="panel red p-6 sm:p-8 space-y-8"
                  >
                    {/* Edition Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#35353b]">
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
                          className="text-3xl sm:text-5xl font-black text-white mt-1 uppercase"
                          style={{ fontFamily: "'Rajdhani', sans-serif" }}
                        >
                          {edition.name}
                        </h3>
                      </div>

                      <Link
                        to={`/editions/${edition.id}`}
                        className="px-5 py-2.5 rounded-xl bg-[#201518] hover:bg-[#2e181c] text-[#ff4d5a] hover:text-[#ff2a38] text-xs font-bold flex items-center justify-center gap-2 transition-all border border-[#e8212e]/60 hover:border-[#ff2a38] shadow-[0_0_14px_rgba(232,33,46,0.25)] w-full sm:w-fit shrink-0 uppercase tracking-wider font-['Rajdhani',sans-serif] min-h-[44px]"
                      >
                        Full Edition Dossier <ArrowRight size={14} />
                      </Link>
                    </div>

                    {/* Official 3D Cyber Podium Trio (Gold 01, Silver 02, Bronze 03) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Crown size={16} className="text-[#fbbf24]" />
                        <span
                          className="text-xs font-mono uppercase tracking-widest text-[#fbbf24] font-bold"
                          style={{ fontFamily: "'Rajdhani', sans-serif" }}
                        >
                          Official Tournament Podium
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                        {/* 1st Place - GOLD (01) */}
                        <div className="order-1 md:order-2 panel gold relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
                          {/* Top Placement Number */}
                          <div
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '52px',
                              fontWeight: 900,
                              lineHeight: 1,
                              color: '#ffd700',
                              textShadow: '0 0 20px rgba(255,215,0,0.65)',
                              marginBottom: '6px',
                            }}
                          >
                            01
                          </div>

                          <div className="w-14 h-14 rounded-full bg-[#ffd700]/20 border-2 border-[#ffd700] flex items-center justify-center text-[#ffd700] mb-3 shadow-[0_0_18px_rgba(255,215,0,0.5)]">
                            <Crown size={28} />
                          </div>
                          <span className="text-[11px] font-black tracking-widest text-[#ffd700] uppercase font-mono">
                            GRAND CHAMPION • 1ST PLACE
                          </span>
                          <h4
                            className="text-2xl sm:text-3xl font-black text-white mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.champion?.name || 'Team I – Jetha ke Jabaz'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#604d22] w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/40 font-bold">
                              <Package size={13} /> {champStats.itemsBought} Lots Won • {formatCurrency(champStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-[#d4af37]">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.champion?.budget ?? 53000000)}</strong>
                            </span>
                          </div>

                          {edition.champion_team_id && (
                            <Link
                              to={`/teams/${edition.champion_team_id}`}
                              className="mt-4 text-xs font-bold text-[#ffd700] hover:underline inline-flex items-center gap-1 font-mono uppercase"
                            >
                              Team Profile <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>

                        {/* 2nd Place - SILVER (02) */}
                        <div className="order-2 md:order-1 panel silver relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
                          {/* Top Placement Number */}
                          <div
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '44px',
                              fontWeight: 900,
                              lineHeight: 1,
                              color: '#ffffff',
                              textShadow: '0 0 16px rgba(255,255,255,0.6)',
                              marginBottom: '6px',
                            }}
                          >
                            02
                          </div>

                          <div className="w-12 h-12 rounded-full bg-slate-200/20 border-2 border-slate-300 flex items-center justify-center text-white mb-3 shadow-[0_0_14px_rgba(255,255,255,0.35)]">
                            <Medal size={26} />
                          </div>
                          <span className="text-[11px] font-bold tracking-widest text-slate-300 uppercase font-mono">
                            RUNNER UP • 2ND PLACE
                          </span>
                          <h4
                            className="text-xl sm:text-2xl font-black text-slate-100 mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.runnerUp?.name || 'Team N – TEAM SSVA'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#3e4450] w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
                              <Package size={13} /> {runnerStats.itemsBought} Lots Won • {formatCurrency(runnerStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.runnerUp?.budget ?? 16000000)}</strong>
                            </span>
                          </div>

                          {edition.runner_up_team_id && (
                            <Link
                              to={`/teams/${edition.runner_up_team_id}`}
                              className="mt-4 text-xs font-bold text-slate-300 hover:text-white hover:underline inline-flex items-center gap-1 font-mono uppercase"
                            >
                              Team Profile <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>

                        {/* 3rd Place - BRONZE / BROWN (03) */}
                        <div className="order-3 panel bronze relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
                          {/* Top Placement Number */}
                          <div
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '44px',
                              fontWeight: 900,
                              lineHeight: 1,
                              color: '#ea580c',
                              textShadow: '0 0 16px rgba(234,88,12,0.6)',
                              marginBottom: '6px',
                            }}
                          >
                            03
                          </div>

                          <div className="w-12 h-12 rounded-full bg-amber-900/30 border-2 border-[#ea580c] flex items-center justify-center text-[#f97316] mb-3 shadow-[0_0_14px_rgba(234,88,12,0.4)]">
                            <Award size={26} />
                          </div>
                          <span className="text-[11px] font-bold tracking-widest text-[#f97316] uppercase font-mono">
                            THIRD PLACE • 3RD PLACE
                          </span>
                          <h4
                            className="text-xl sm:text-2xl font-black text-slate-100 mt-1"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {edition.thirdPlace?.name || 'Team M – Script Squad'}
                          </h4>

                          {/* Amount Spent & Items Bought */}
                          <div className="mt-4 pt-3 border-t border-[#4a2e1c] w-full flex flex-col items-center gap-1.5 font-mono text-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 text-amber-300 border border-amber-800/60">
                              <Package size={13} /> {thirdStats.itemsBought} Lots Won • {formatCurrency(thirdStats.amountSpent)} Spent
                            </div>
                            <span className="text-[11px] text-[#f97316]">
                              Remaining Budget: <strong className="text-white">{formatCurrency(edition.thirdPlace?.budget ?? 53000000)}</strong>
                            </span>
                          </div>

                          {edition.third_place_team_id && (
                            <Link
                              to={`/teams/${edition.third_place_team_id}`}
                              className="mt-4 text-xs font-bold text-[#f97316] hover:underline inline-flex items-center gap-1 font-mono uppercase"
                            >
                              Team Profile <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SECTION: FINAL STANDINGS TABLE (Exact LiveTeamStatus Table Style) */}
                    <div className="space-y-4 pt-6 border-t border-[#35353b]">
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
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            height: '26px',
                            border: '1px solid rgba(232, 33, 46, 0.55)',
                            borderRadius: '9999px',
                            background: 'rgba(232, 33, 46, 0.12)',
                            padding: '0 11px',
                          }}
                        >
                          <div className="dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e8212e', boxShadow: '0 0 6px #e8212e', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ff4350', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>
                            FINALIZED STANDINGS
                          </span>
                        </div>
                      </div>

                      {/* Live View Table Style with panel red and alternating row background */}
                      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table
                          style={{
                            width: '100%',
                            minWidth: '600px',
                            borderCollapse: 'separate',
                            borderSpacing: '0 3px',
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                height: '36px',
                                background: '#1a1a1f',
                                borderRadius: '6px',
                                color: '#9a9aa3',
                                fontSize: '15px',
                                fontWeight: 600,
                                letterSpacing: '0.8px',
                                fontFamily: "'Rajdhani', sans-serif",
                              }}
                            >
                              <th style={{ width: '70px', textAlign: 'center', padding: '0 8px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>#</th>
                              <th style={{ textAlign: 'left', padding: '0 14px' }}>TEAM NAME</th>
                              <th style={{ width: '140px', textAlign: 'center', padding: '0 12px' }}>ITEMS BOUGHT</th>
                              <th style={{ width: '180px', textAlign: 'right', padding: '0 14px' }}>AMOUNT SPENT</th>
                              <th style={{ width: '180px', textAlign: 'right', padding: '0 14px' }}>REMAINING BUDGET</th>
                              <th style={{ width: '100px', textAlign: 'center', padding: '0 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>PROFILE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((row, idx) => {
                              const isEven = idx % 2 === 0;
                              const rowBg = row.rank === 1
                                ? '#2e2511'
                                : row.rank === 2
                                ? '#20232a'
                                : row.rank === 3
                                ? '#281a12'
                                : (isEven ? '#18181d' : '#121216');

                              return (
                                <tr
                                  key={row.team.id}
                                  style={{
                                    height: '42px',
                                    background: rowBg,
                                    fontFamily: "'Rajdhani', sans-serif",
                                  }}
                                  className="transition-colors hover:brightness-110"
                                >
                                  {/* Rank Number Badge */}
                                  <td style={{ textAlign: 'center', padding: '0 8px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>
                                    {row.rank === 1 ? (
                                      <span
                                        className="num"
                                        style={{
                                          background: 'rgba(255, 215, 0, 0.2)',
                                          border: '1px solid #ffd700',
                                          color: '#ffd700',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                        }}
                                      >
                                        01
                                      </span>
                                    ) : row.rank === 2 ? (
                                      <span
                                        className="num"
                                        style={{
                                          background: 'rgba(203, 213, 225, 0.2)',
                                          border: '1px solid #cbd5e1',
                                          color: '#ffffff',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                        }}
                                      >
                                        02
                                      </span>
                                    ) : row.rank === 3 ? (
                                      <span
                                        className="num"
                                        style={{
                                          background: 'rgba(234, 88, 12, 0.2)',
                                          border: '1px solid #ea580c',
                                          color: '#f97316',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                        }}
                                      >
                                        03
                                      </span>
                                    ) : (
                                      <span className="num" style={{ color: '#9a9aa3', padding: '2px 6px' }}>
                                        {String(idx + 1).padStart(2, '0')}
                                      </span>
                                    )}
                                  </td>

                                  {/* Team Name */}
                                  <td style={{ padding: '0 14px' }}>
                                    <Link
                                      to={`/teams/${row.team.id}`}
                                      className="font-bold text-white hover:text-[#ff4d5a] transition-colors"
                                      style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', letterSpacing: '0.02em' }}
                                    >
                                      {row.team.name}
                                    </Link>
                                  </td>

                                  {/* Items Bought */}
                                  <td style={{ textAlign: 'center', padding: '0 12px' }}>
                                    <span
                                      className="num"
                                      style={{
                                        padding: '2px 10px',
                                        fontWeight: 700,
                                        color: '#f4f4f6',
                                        fontSize: '14px',
                                      }}
                                    >
                                      {row.itemsBought} Lots
                                    </span>
                                  </td>

                                  {/* Amount Spent */}
                                  <td style={{ textAlign: 'right', padding: '0 14px', fontWeight: 700, color: '#ff4d5a', fontSize: '15px' }}>
                                    {formatCurrency(row.amountSpent)}
                                  </td>

                                  {/* Remaining Budget */}
                                  <td style={{ textAlign: 'right', padding: '0 14px', fontWeight: 700, color: '#3fe085', fontSize: '15px' }}>
                                    {formatCurrency(row.remainingBudget)}
                                  </td>

                                  {/* Profile Button */}
                                  <td style={{ textAlign: 'center', padding: '0 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>
                                    <Link
                                      to={`/teams/${row.team.id}`}
                                      className="px-2.5 py-1 rounded bg-[#2a2a32] hover:bg-[#383842] text-[12px] text-[#ff4d5a] border border-[rgba(255,255,255,0.09)] transition-colors font-mono inline-flex items-center gap-1 font-bold"
                                    >
                                      View <ChevronRight size={12} />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
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
