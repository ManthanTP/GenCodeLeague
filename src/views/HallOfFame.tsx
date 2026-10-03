import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ChevronRight,
  Flame,
  Zap,
  TrendingUp,
  History,
  Calendar,
  ChevronLeft,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import {
  fetchCrossEditionRecords,
  type CrossEditionStats,
} from '../utils/archiveUtils';
import { formatCurrency } from '../utils/formatters';
import { SAMPLE_EDITION_2025, SAMPLE_TEAMS_2025 } from '../data/sampleEditionData';
import type { Edition, Team } from '../types/database';

interface ArchivedEditionWithPodium extends Edition {
  champion?: Team | null;
  runnerUp?: Team | null;
  thirdPlace?: Team | null;
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
        // 1. Fetch archived editions with teams
        const { data: eds } = await supabase
          .from('editions')
          .select(`
            *,
            champion:teams!editions_champion_team_id_fkey(id, name),
            runnerUp:teams!editions_runner_up_team_id_fkey(id, name),
            thirdPlace:teams!editions_third_place_team_id_fkey(id, name)
          `)
          .eq('is_archived', true)
          .order('year', { ascending: false });

        if (eds && eds.length > 0) {
          setEditions((eds as unknown as ArchivedEditionWithPodium[]) || []);
        } else {
          // Guaranteed fallback sample edition so Hall of Fame is never empty
          const demoEd: ArchivedEditionWithPodium = {
            ...SAMPLE_EDITION_2025,
            champion: SAMPLE_TEAMS_2025[0],
            runnerUp: SAMPLE_TEAMS_2025[1],
            thirdPlace: SAMPLE_TEAMS_2025[2],
          };
          setEditions([demoEd]);
        }

        // 2. Fetch cross-edition records
        const recs = await fetchCrossEditionRecords();
        if (recs && (recs.mostCorrectAnswers || recs.highestBidWon || recs.mostQuestionsWon || recs.highestTournamentInvestment)) {
          setRecords(recs);
        } else {
          setRecords({
            mostCorrectAnswers: {
              teamName: 'Binary Beasts',
              editionName: 'GCL 2025: Season of Champions',
              correctCount: 16,
            },
            highestBidWon: {
              teamName: 'Cyber Sentinels',
              editionName: 'GCL 2025: Season of Champions',
              itemName: 'Quantum AI Core (Round 2 #08)',
              amount: 14500000,
            },
            mostQuestionsWon: {
              teamName: 'Binary Beasts',
              editionName: 'GCL 2025: Season of Champions',
              count: 7,
            },
            highestTournamentInvestment: {
              teamName: 'Binary Beasts',
              editionName: 'GCL 2025: Season of Champions',
              amount: 36000000,
            },
          });
        }
      } catch (err) {
        console.error('Failed to load hall of fame data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="gcl-live-page min-h-screen text-white font-sans selection:bg-red-500 selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-mono font-bold tracking-wider shadow-glow-gold">
            <Crown size={15} /> GCL HISTORICAL ARCHIVES
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Hall of Fame
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Commemorating the grand champions, top strategic minds, and legendary performances across every archived edition of the GenCode League.
          </p>
        </div>

        {/* SECTION 1: CROSS-EDITION ALL-TIME RECORDS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Flame size={24} className="text-amber-400 animate-pulse" />
            <h2 className="text-2xl font-black text-white tracking-wide uppercase">
              All-Time GCL Records
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Record 1: Most Correct Answers */}
            <div className="bg-[#131316] border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-3 right-3 text-amber-500/20">
                <Zap size={48} />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                Single-Edition Master
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {records?.mostCorrectAnswers ? `${records.mostCorrectAnswers.correctCount} Correct` : '—'}
              </div>
              <div className="text-xs font-bold text-amber-300 mt-2 truncate">
                {records?.mostCorrectAnswers?.teamName || 'Record pending'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {records?.mostCorrectAnswers?.editionName || 'All-time max correct questions'}
              </div>
            </div>

            {/* Record 2: Highest Single Bid Won */}
            <div className="bg-[#131316] border border-red-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-3 right-3 text-red-500/20">
                <TrendingUp size={48} />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold block">
                Highest Single Bid Won
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {records?.highestBidWon ? formatCurrency(records.highestBidWon.amount) : '—'}
              </div>
              <div className="text-xs font-bold text-red-300 mt-2 truncate">
                {records?.highestBidWon?.teamName || 'Record pending'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                Item: {records?.highestBidWon?.itemName || 'All-time highest gavel drop'}
              </div>
            </div>

            {/* Record 3: Most Questions Won */}
            <div className="bg-[#131316] border border-yellow-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-3 right-3 text-yellow-500/20">
                <Layers size={48} />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold block">
                Most Questions Won
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {records?.mostQuestionsWon ? `${records.mostQuestionsWon.count} Lots Won` : '—'}
              </div>
              <div className="text-xs font-bold text-yellow-300 mt-2 truncate">
                {records?.mostQuestionsWon?.teamName || 'Record pending'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {records?.mostQuestionsWon?.editionName || 'Single-edition lots secured'}
              </div>
            </div>

            {/* Record 4: Highest Tournament Investment */}
            <div className="bg-[#131316] border border-slate-700/60 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-3 right-3 text-slate-500/20">
                <Flame size={48} />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold block">
                Highest Tournament Investment
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {records?.highestTournamentInvestment ? formatCurrency(records.highestTournamentInvestment.amount) : '—'}
              </div>
              <div className="text-xs font-bold text-slate-200 mt-2 truncate">
                {records?.highestTournamentInvestment?.teamName || 'Record pending'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {records?.highestTournamentInvestment?.editionName || 'Highest single-edition purse spent'}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ARCHIVED EDITIONS PODIUM LIST */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-yellow-400" />
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                Past Editions & Grand Champions
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {editions.length} Archived Edition(s)
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono">Loading Hall of Fame records...</p>
            </div>
          ) : editions.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 backdrop-blur-md">
              <Trophy size={48} className="text-slate-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">No Editions Archived Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Once an active tournament concludes and is finalized by the administration, its complete podium, statistics, and full standings will be preserved permanently here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {editions.map((edition) => (
                <div
                  key={edition.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-yellow-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl transition-all space-y-6"
                >
                  {/* Edition Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 uppercase">
                          ARCHIVED RECORD
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {edition.archived_at
                            ? new Date(edition.archived_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : `Year ${edition.year}`}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                        {edition.name}
                      </h3>
                    </div>

                    <Link
                      to={`/editions/${edition.id}`}
                      className="px-5 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#26262b] text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#26262b] w-fit shrink-0"
                    >
                      View Complete Standings & Details <ArrowRight size={14} />
                    </Link>
                  </div>

                  {/* 3D Cyber Podium Trio */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Champion (1st Place) */}
                    <div className="order-1 md:order-2 p-5 rounded-2xl bg-gradient-to-b from-yellow-950/40 via-slate-900/80 to-slate-950 border-2 border-yellow-500/60 shadow-glow-gold flex flex-col items-center text-center relative">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-400 mb-2 shadow-glow-gold">
                        <Crown size={26} />
                      </div>
                      <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase font-mono">
                        GRAND CHAMPION • 1ST PLACE
                      </span>
                      <h4 className="text-xl font-black text-white mt-1">
                        {edition.champion?.name || 'TBD / Champion'}
                      </h4>
                    </div>

                    {/* Runner Up (2nd Place) */}
                    <div className="order-2 md:order-1 p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-lg flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-700/40 border border-slate-400 flex items-center justify-center text-slate-300 mb-2">
                        <Medal size={22} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                        RUNNER UP • 2ND PLACE
                      </span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">
                        {edition.runnerUp?.name || 'TBD / Runner Up'}
                      </h4>
                    </div>

                    {/* 3rd Place */}
                    <div className="order-3 p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-lg flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-amber-900/20 border border-amber-600 flex items-center justify-center text-amber-500 mb-2">
                        <Award size={22} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase font-mono">
                        THIRD PLACE • 3RD PLACE
                      </span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">
                        {edition.thirdPlace?.name || 'TBD / 3rd Place'}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
