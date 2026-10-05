import React, { useEffect, useState } from 'react';
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
            {/* Section 2: All-time records */}
            <div className="gcl-card mb-[16px]">
              <h2 className="gcl-card-title mb-4">
                All-time records
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="gcl-inner-tile">
                  <p className="text-xs text-[#8a8a93] font-sans">Tournament champion</p>
                  <p
                    className="text-sm sm:text-base font-bold text-white mt-1 truncate"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    {records?.mostChampionships?.teamName || activeEdition?.champion?.name || '—'}
                  </p>
                </div>
                <div className="gcl-inner-tile">
                  <p className="text-xs text-[#8a8a93] font-sans">Peak auction spend</p>
                  <p
                    className="text-sm sm:text-base font-bold text-[#ff4d5a] mt-1 truncate"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    {records?.highestBidWon
                      ? `${formatCurrency(records.highestBidWon.amount)} – ${records.highestBidWon.teamName}`
                      : '—'}
                  </p>
                </div>
                <div className="gcl-inner-tile">
                  <p className="text-xs text-[#8a8a93] font-sans">Priciest lot</p>
                  <p
                    className="text-sm sm:text-base font-bold text-white mt-1 truncate"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    {records?.highestBidWon?.itemName || '—'}
                  </p>
                </div>
                <div className="gcl-inner-tile">
                  <p className="text-xs text-[#8a8a93] font-sans">Tournament purse</p>
                  <p
                    className="text-sm sm:text-base font-bold text-white mt-1 font-mono"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    ₹15.00 Cr
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

              {/* 3 Step Compact Podium Cards — Medal Variants */}
              <div className="flex flex-col sm:flex-row items-end justify-center gap-4 lg:gap-6 pt-2">
                {/* 2nd Place: Runner-up (Left, Medium) */}
                <div
                  className="gcl-card gcl-card--silver gcl-card--interactive p-4 flex flex-col items-center text-center w-full sm:w-[220px] md:w-[240px]"
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
                  className="gcl-card gcl-card--gold gcl-card--sheen gcl-card--interactive p-4 sm:p-5 flex flex-col items-center text-center w-full sm:w-[260px] md:w-[280px] order-first sm:order-none"
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
                  className="gcl-card gcl-card--bronze gcl-card--interactive p-4 flex flex-col items-center text-center w-full sm:w-[200px] md:w-[220px]"
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
