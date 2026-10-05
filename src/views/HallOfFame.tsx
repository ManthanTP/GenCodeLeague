import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import MetallicTrophyCup from '../components/MetallicTrophyCup';
import {
  fetchCrossEditionRecords,
  type CrossEditionStats,
} from '../utils/archiveUtils';
import { formatCurrency } from '../utils/formatters';
import type { Edition, Team, TeamItem } from '../types/database';
import './HallOfFame.css';

interface ArchivedEditionWithPodium extends Edition {
  champion?: Team | null;
  runnerUp?: Team | null;
  thirdPlace?: Team | null;
  teams?: Team[];
  items?: TeamItem[];
}

export default function HallOfFame() {
  const [editions, setEditions] = useState<ArchivedEditionWithPodium[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
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
          setSelectedEditionId(eds[0].id);
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
  const getTeamStats = (edition?: ArchivedEditionWithPodium, teamId?: string | null) => {
    if (!edition || !teamId || !edition.items) return { itemsBought: 0, amountSpent: 0 };
    const teamItems = edition.items.filter((it) => it.team_id === teamId);
    const amountSpent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
    return {
      itemsBought: teamItems.length,
      amountSpent,
    };
  };

  const activeEdition = editions.find((e) => e.id === selectedEditionId) || editions[0];
  const champStats = getTeamStats(activeEdition, activeEdition?.champion_team_id);
  const runnerStats = getTeamStats(activeEdition, activeEdition?.runner_up_team_id);
  const thirdStats = getTeamStats(activeEdition, activeEdition?.third_place_team_id);

  // Compute all-time records from data already loaded in the page
  const allTimeRecords = useMemo(() => {
    if (!editions || editions.length === 0) {
      return {
        champion: '—',
        championSub: 'All-time title leader',
        peakSpend: '—',
        peakSpendSub: '0 lots',
        priciestLot: '—',
        priciestLotSub: '—',
        mostLots: '—',
        mostLotsSub: 'Single edition record',
      };
    }

    const allItems: TeamItem[] = [];
    const teamMap = new Map<string, string>();
    const editionMap = new Map<string, string>();

    editions.forEach((ed) => {
      editionMap.set(ed.id, ed.name);
      (ed.teams || []).forEach((t) => {
        teamMap.set(t.id, t.name);
      });
      (ed.items || []).forEach((it) => {
        allItems.push(it);
      });
    });

    // 1. Tournament champion (unchanged)
    const champName = records?.mostChampionships?.teamName || activeEdition?.champion?.name || '—';
    const champSub = activeEdition?.name ? `Champion, ${activeEdition.name}` : 'All-time title leader';

    // 2. Peak auction spend = team with highest TOTAL amount spent across all editions (sum of that team's lots)
    // Example: "₹13.40 Cr — Team N – TEAM SSVA", secondary line "6 lots"
    const spendByTeam: Record<string, { amt: number; lots: number; name: string }> = {};
    allItems.forEach((it) => {
      if (!it.team_id) return;
      const tName = teamMap.get(it.team_id) || 'Unknown Team';
      if (!spendByTeam[it.team_id]) {
        spendByTeam[it.team_id] = { amt: 0, lots: 0, name: tName };
      }
      spendByTeam[it.team_id].amt += Number(it.cost || 0);
      spendByTeam[it.team_id].lots += 1;
    });

    const sortedSpend = Object.values(spendByTeam).sort((a, b) => b.amt - a.amt);
    const topSpender = sortedSpend[0];
    const peakSpend = topSpender
      ? `${formatCurrency(topSpender.amt)} — ${topSpender.name}`
      : '—';
    const peakSpendSub = topSpender ? `${topSpender.lots} lots` : '0 lots';

    // 3. Priciest lot = single most expensive lot ever sold
    // Example: "₹3.37 Cr — Team O – Trivia Titans", secondary line "Lot #1"
    const sortedLots = [...allItems].sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0));
    const topLot = sortedLots[0];
    let priciestLot = '—';
    let priciestLotSub = '—';
    if (topLot) {
      const lotTeamName = (topLot.team_id && teamMap.get(topLot.team_id)) || 'Unknown Team';
      priciestLot = `${formatCurrency(topLot.cost || 0)} — ${lotTeamName}`;
      const parts = (topLot.item_name || '').split('—');
      priciestLotSub = parts[0]?.trim() || topLot.item_name || 'Lot #1';
    }

    // 4. Most lots bought = team with the most lots in one edition
    // Example: "6 lots — Team N – TEAM SSVA". If teams tie, show the first in the existing order.
    const lotsInEd: Record<string, { count: number; teamName: string; editionId: string }> = {};
    allItems.forEach((it) => {
      if (!it.team_id || !it.edition_id) return;
      const key = `${it.edition_id}_${it.team_id}`;
      if (!lotsInEd[key]) {
        lotsInEd[key] = {
          count: 0,
          teamName: teamMap.get(it.team_id) || 'Unknown Team',
          editionId: it.edition_id,
        };
      }
      lotsInEd[key].count += 1;
    });

    const sortedLotsInEd = Object.values(lotsInEd).sort((a, b) => b.count - a.count);
    const topLotsTeam = sortedLotsInEd[0];
    const mostLots = topLotsTeam
      ? `${topLotsTeam.count} lots — ${topLotsTeam.teamName}`
      : '—';
    const mostLotsSub = topLotsTeam
      ? `${editionMap.get(topLotsTeam.editionId) || 'Single edition record'}`
      : 'Single edition record';

    return {
      champion: champName,
      championSub: champSub,
      peakSpend,
      peakSpendSub,
      priciestLot,
      priciestLotSub,
      mostLots,
      mostLotsSub,
    };
  }, [editions, records, activeEdition]);

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="page-shell">
        {/* Section 1: Archive of past champions / Hall of fame Banner */}
        <div className="gcl-card gcl-card--hero mb-[22px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="gcl-hero-pill">
                <span className="gcl-hero-dot" />
                <span>Archive of past champions</span>
              </div>
              <h1 className="gcl-hero-title mb-0">
                Hall of fame
              </h1>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-3">
              {editions.length > 1 ? (
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                  {editions.map((ed) => (
                    <button
                      key={ed.id}
                      onClick={() => setSelectedEditionId(ed.id)}
                      className={`gcl-chip-btn ${selectedEditionId === ed.id ? 'active' : ''}`}
                    >
                      {ed.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gcl-btn-outline-red px-3.5 py-1 text-xs font-bold font-mono tracking-wider cursor-default h-[40px] flex items-center">
                  {editions.length > 0 ? `${editions.length} Edition` : '1 Edition'}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#9a9aa3]">
            <div className="w-10 h-10 border-4 border-[#e8212e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono">Loading Hall of Fame records...</p>
          </div>
        ) : editions.length === 0 ? (
          <div className="gcl-card text-center p-8 sm:p-12 mb-[16px]">
            <Trophy size={48} className="text-[#3a3a41] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">No Editions Archived Yet</h3>
            <p className="text-xs text-[#9a9aa3] mt-1 max-w-md mx-auto font-sans">
              Once an active tournament concludes and is finalized, its podium, records, and full standings will be preserved permanently here.
            </p>
          </div>
        ) : (
          <>
            {/* Section 2: All-time records (4 equal horizontal boxes) */}
            <div className="gcl-card mb-[16px]">
              <h2 className="gcl-card-title mb-4">
                All-time records
              </h2>
              <div className="hof-records-grid">
                {/* 1. Tournament champion */}
                <div className="hof-record-box">
                  <p className="hof-record-label">Tournament champion</p>
                  <p className="hof-record-value" title={allTimeRecords.champion}>
                    {allTimeRecords.champion}
                  </p>
                  <p className="hof-record-sub">
                    {allTimeRecords.championSub}
                  </p>
                </div>

                {/* 2. Peak auction spend */}
                <div className="hof-record-box">
                  <p className="hof-record-label">Peak auction spend</p>
                  <p className="hof-record-value text-[#ff4d5a]" title={allTimeRecords.peakSpend}>
                    {allTimeRecords.peakSpend}
                  </p>
                  <p className="hof-record-sub">
                    {allTimeRecords.peakSpendSub}
                  </p>
                </div>

                {/* 3. Priciest lot */}
                <div className="hof-record-box">
                  <p className="hof-record-label">Priciest lot</p>
                  <p className="hof-record-value" title={allTimeRecords.priciestLot}>
                    {allTimeRecords.priciestLot}
                  </p>
                  <p className="hof-record-sub">
                    {allTimeRecords.priciestLotSub}
                  </p>
                </div>

                {/* 4. Most lots bought */}
                <div className="hof-record-box">
                  <p className="hof-record-label">Most lots bought</p>
                  <p className="hof-record-value" title={allTimeRecords.mostLots}>
                    {allTimeRecords.mostLots}
                  </p>
                  <p className="hof-record-sub">
                    {allTimeRecords.mostLotsSub}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Podium (Clean glowing borders, compact sizes) */}
            <div className="gcl-card mb-[16px]">
              {/* Podium Header */}
              <div className="flex items-center justify-between gap-3 pb-1 mb-4">
                <div>
                  <h2 className="gcl-card-title">
                    Podium
                  </h2>
                  <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                    Final result, {activeEdition?.name || 'GCL 2025'}
                  </p>
                </div>
                <div className="gcl-btn-outline-red px-3 py-1 text-xs font-mono font-bold tracking-wider cursor-default h-[40px] flex items-center">
                  {activeEdition?.name || 'GCL 2025'}
                </div>
              </div>

              {/* 3 Step Compact Podium Cards — 3 Columns Filling Width */}
              <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4 lg:gap-6 pt-2 w-full">
                {/* 2nd Place: Runner-up (Left, Medium) */}
                <div
                  className="gcl-card gcl-card--silver gcl-card--interactive p-4 flex flex-col items-center text-center w-full"
                  style={{ minHeight: '225px' }}
                >
                  <div className="w-full flex flex-col items-center flex-1 justify-center">
                    <MetallicTrophyCup type="silver" size={48} />
                    <span
                      className="text-xl font-black text-slate-300 mt-1 leading-none"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      2
                    </span>
                    <h3
                      className="text-sm sm:text-base font-bold text-white mt-1 line-clamp-1"
                      style={{ fontFamily: "'Barlow Semi Condensed', 'Rajdhani', sans-serif", fontWeight: 700 }}
                    >
                      {activeEdition?.runnerUp?.name || '—'}
                    </h3>
                    <p className="text-xs text-[#8a8a93] mt-0.5 font-sans">Runner-up</p>
                    <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                      {runnerStats.itemsBought} lots · {formatCurrency(runnerStats.amountSpent)}
                    </p>
                  </div>
                  {activeEdition?.runner_up_team_id && (
                    <Link
                      to={`/teams/${activeEdition.runner_up_team_id}`}
                      className="mt-3 gcl-btn-outline-red px-3.5 py-1 text-xs h-[40px] flex items-center justify-center"
                    >
                      View profile
                    </Link>
                  )}
                </div>

                {/* 1st Place: Grand Champion (Center, Tallest, Glowing Gold Border + Sheen) */}
                <div
                  className="gcl-card gcl-card--gold gcl-card--sheen gcl-card--interactive p-4 sm:p-5 flex flex-col items-center text-center w-full order-first sm:order-none"
                  style={{ minHeight: '265px' }}
                >
                  <div className="w-full flex flex-col items-center flex-1 justify-center">
                    <MetallicTrophyCup type="gold" size={64} />
                    <span
                      className="text-2xl sm:text-3xl font-black text-[#fbbf24] mt-1 leading-none"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      1
                    </span>
                    <h3
                      className="text-base sm:text-lg font-black text-white mt-1 line-clamp-1 tracking-tight"
                      style={{ fontFamily: "'Barlow Semi Condensed', 'Rajdhani', sans-serif", fontWeight: 700 }}
                    >
                      {activeEdition?.champion?.name || '—'}
                    </h3>
                    <p className="text-xs text-[#fbbf24] font-medium mt-0.5 font-sans">
                      Grand champion
                    </p>
                    <p className="text-xs text-[#a1a1aa] font-mono mt-0.5">
                      {champStats.itemsBought} lots · {formatCurrency(champStats.amountSpent)}
                    </p>
                  </div>
                  {activeEdition?.champion_team_id && (
                    <Link
                      to={`/teams/${activeEdition.champion_team_id}`}
                      className="mt-3 gcl-btn-outline-red px-4 py-1 text-xs h-[40px] flex items-center justify-center"
                    >
                      View profile
                    </Link>
                  )}
                </div>

                {/* 3rd Place: Third Place (Right, Smallest, Glowing Bronze Border) */}
                <div
                  className="gcl-card gcl-card--bronze gcl-card--interactive p-4 flex flex-col items-center text-center w-full"
                  style={{ minHeight: '210px' }}
                >
                  <div className="w-full flex flex-col items-center flex-1 justify-center">
                    <MetallicTrophyCup type="bronze" size={44} />
                    <span
                      className="text-lg font-black text-[#f97316] mt-1 leading-none"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      3
                    </span>
                    <h3
                      className="text-xs sm:text-sm font-bold text-white mt-1 line-clamp-1"
                      style={{ fontFamily: "'Barlow Semi Condensed', 'Rajdhani', sans-serif", fontWeight: 700 }}
                    >
                      {activeEdition?.thirdPlace?.name || '—'}
                    </h3>
                    <p className="text-xs text-[#8a8a93] mt-0.5 font-sans">Third place</p>
                    <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                      {thirdStats.itemsBought} lots · {formatCurrency(thirdStats.amountSpent)}
                    </p>
                  </div>
                  {activeEdition?.third_place_team_id && (
                    <Link
                      to={`/teams/${activeEdition.third_place_team_id}`}
                      className="mt-3 gcl-btn-outline-red px-3.5 py-1 text-xs h-[40px] flex items-center justify-center"
                    >
                      View profile
                    </Link>
                  )}
                </div>
              </div>

              {/* View Edition Details Button */}
              {activeEdition && (
                <div className="flex justify-center pt-6">
                  <Link
                    to={`/editions/${activeEdition.id}`}
                    className="gcl-btn-outline-red px-6 py-2.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 h-[44px]"
                  >
                    View edition details
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
