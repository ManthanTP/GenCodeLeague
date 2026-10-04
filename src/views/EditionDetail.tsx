import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  ChevronLeft,
  FileText,
  Image,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import MetallicTrophyCup from '../components/MetallicTrophyCup';
import {
  fetchEditionComputedStats,
  type EditionComputedStats,
} from '../utils/archiveUtils';
import { formatCurrency } from '../utils/formatters';
import type { Edition, Team, Sponsor, GalleryPhoto, TeamItem } from '../types/database';

interface EditionWithPodium extends Edition {
  champion?: Team | null;
  runnerUp?: Team | null;
  thirdPlace?: Team | null;
}

export default function EditionDetail() {
  const { editionId } = useParams<{ editionId: string }>();
  const [edition, setEdition] = useState<EditionWithPodium | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamItems, setTeamItems] = useState<TeamItem[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [stats, setStats] = useState<EditionComputedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!editionId) return;

    async function loadEditionData() {
      setLoading(true);
      try {
        // 1. Fetch Edition
        const { data: rawEdition } = await supabase
          .from('editions')
          .select('*')
          .eq('id', editionId)
          .single();

        // 2. Fetch Teams & Standings for this edition
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', editionId)
          .order('sort_order', { ascending: true });

        const loadedTeams = teamsData || [];
        setTeams(loadedTeams);

        // 2b. Fetch Team Items for this edition
        const { data: itemsData } = await supabase
          .from('team_items')
          .select('*')
          .eq('edition_id', editionId);

        setTeamItems(itemsData || []);

        // Resolve podium teams from loadedTeams
        if (rawEdition) {
          const champ = loadedTeams.find((t) => t.id === rawEdition.champion_team_id) || null;
          const runner = loadedTeams.find((t) => t.id === rawEdition.runner_up_team_id) || null;
          const third = loadedTeams.find((t) => t.id === rawEdition.third_place_team_id) || null;

          setEdition({
            ...rawEdition,
            champion: champ,
            runnerUp: runner,
            thirdPlace: third,
          });
        }

        // 3. Fetch Sponsors
        const { data: sponsorsData } = await supabase
          .from('sponsors')
          .select('*')
          .eq('edition_id', editionId)
          .order('sort_order', { ascending: true });

        setSponsors(sponsorsData || []);

        // 4. Fetch Sample Gallery Photos
        const { data: photosData } = await supabase
          .from('gallery_photos')
          .select('*')
          .eq('edition_id', editionId)
          .limit(6);

        setPhotos(photosData || []);

        // 5. Fetch Computed Real Statistics
        if (editionId) {
          const computed = await fetchEditionComputedStats(editionId);
          setStats(computed);
        }
      } catch (err) {
        console.error('Failed to load edition detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEditionData();
  }, [editionId]);

  // Group Sponsors by Tier
  const sponsorsByTier = sponsors.reduce<Record<string, Sponsor[]>>((acc, s) => {
    const tier = s.tier || 'Partners';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(s);
    return acc;
  }, {});

  // Stats helpers
  const getTeamStats = (teamId?: string | null) => {
    if (!teamId) return { itemsBought: 0, amountSpent: 0 };
    const bought = teamItems.filter((it) => it.team_id === teamId);
    const amountSpent = bought.reduce((acc, it) => acc + (it.cost || 0), 0);
    return {
      itemsBought: bought.length,
      amountSpent,
    };
  };

  const champStats = getTeamStats(edition?.champion_team_id);
  const runnerStats = getTeamStats(edition?.runner_up_team_id);
  const thirdStats = getTeamStats(edition?.third_place_team_id);

  // Build sorted standings list
  const sortedStandings = [...teams].sort((a, b) => {
    const championId = edition?.champion_team_id;
    const runnerUpId = edition?.runner_up_team_id;
    const thirdPlaceId = edition?.third_place_team_id;

    if (a.id === championId) return -1;
    if (b.id === championId) return 1;
    if (a.id === runnerUpId) return -1;
    if (b.id === runnerUpId) return 1;
    if (a.id === thirdPlaceId) return -1;
    if (b.id === thirdPlaceId) return 1;

    const spentA = getTeamStats(a.id).amountSpent;
    const spentB = getTeamStats(b.id).amountSpent;
    return spentB - spentA;
  });

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/hall-of-fame"
            className="gcl-btn-outline-red px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft size={15} /> Back to Hall of Fame
          </Link>

          {edition?.is_archived && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/40 uppercase shadow-[0_0_12px_rgba(255,215,0,0.15)]">
                COMPLETED
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#18181c] text-[#a1a1aa] border border-[#2c2c34] uppercase">
                HISTORICAL / PREVIOUS EDITION
              </span>
            </div>
          )}
        </div>

        {/* Hero Banner with Crimson Glowing Card */}
        <div className="gcl-card-crimson relative overflow-hidden rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[rgba(232,33,46,0.18)] text-[#ff4d5a] border border-[#ff2a38]/40 uppercase tracking-widest">
                OFFICIAL DOSSIER
              </span>
              <span className="text-xs font-mono text-[#9a9aa3] uppercase tracking-wider">
                Full Tournament Archive
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              {edition?.name || 'GenCode League'}
            </h1>
            <p className="text-sm text-[#9a9aa3] max-w-2xl font-sans">
              Complete competition record, official podium finishes, team transaction dossiers, and verified edition statistics.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link
              to={`/gallery?edition=${edition?.id}`}
              className="gcl-btn-outline-red px-5 py-2.5 text-xs font-bold uppercase tracking-wider min-h-[44px] inline-flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <Image size={15} /> Event Gallery
            </Link>
            <Link
              to={`/my-certificates`}
              className="gcl-btn-outline-red px-5 py-2.5 text-xs font-bold uppercase tracking-wider min-h-[44px] flex-1 sm:flex-none justify-center"
            >
              <FileText size={15} className="mr-1.5" /> Certificates
            </Link>
          </div>
        </div>

        {/* OFFICIAL PODIUM (Gold 01, Silver 02, Bronze 03 — Matching Compact Glowing Design) */}
        {edition && (
          <div
            className="gcl-card-crimson p-5 sm:p-7 space-y-6"
            style={{
              background:
                'radial-gradient(circle at 10% 20%, rgba(232, 33, 46, 0.08) 0%, transparent 45%), linear-gradient(165deg, #15151b, #0c0c10)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1">
              <div>
                <h2
                  className="text-lg sm:text-xl font-bold text-white tracking-wide"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Official Tournament Podium
                </h2>
                <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                  Final result, {edition?.name || 'GCL 2025'}
                </p>
              </div>
              <div className="gcl-btn-outline-red px-3 py-1 text-xs font-mono font-bold tracking-wider cursor-default">
                {edition?.name || 'GCL 2025'}
              </div>
            </div>

            {/* 3 Step Compact Podium Cards */}
            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 lg:gap-6 pt-2">
              {/* 2nd Place: Runner-up (Left, Medium) */}
              <div
                className="gcl-podium-silver p-4 flex flex-col items-center text-center w-full sm:w-[220px] md:w-[240px] transition-all"
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
                    {edition.runnerUp?.name || '—'}
                  </h3>
                  <p className="text-xs text-[#8a8a93] mt-0.5 font-sans">Runner-up</p>
                  <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                    {runnerStats.itemsBought} lots · {formatCurrency(runnerStats.amountSpent)}
                  </p>
                </div>
                {edition.runner_up_team_id && (
                  <Link
                    to={`/teams/${edition.runner_up_team_id}`}
                    className="mt-3 gcl-btn-outline-red px-3.5 py-1 text-xs"
                  >
                    View profile
                  </Link>
                )}
              </div>

              {/* 1st Place: Grand Champion (Center, Tallest, Glowing Gold Border) */}
              <div
                className="gcl-podium-gold p-4 sm:p-5 flex flex-col items-center text-center w-full sm:w-[260px] md:w-[280px] transition-all order-first sm:order-none"
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
                    {edition.champion?.name || '—'}
                  </h3>
                  <p className="text-xs text-[#fbbf24] font-medium mt-0.5 font-sans">
                    Grand champion
                  </p>
                  <p className="text-xs text-[#a1a1aa] font-mono mt-0.5">
                    {champStats.itemsBought} lots · {formatCurrency(champStats.amountSpent)}
                  </p>
                </div>
                {edition.champion_team_id && (
                  <Link
                    to={`/teams/${edition.champion_team_id}`}
                    className="mt-3 gcl-btn-outline-red px-4 py-1 text-xs"
                  >
                    View profile
                  </Link>
                )}
              </div>

              {/* 3rd Place: Third Place (Right, Smallest, Glowing Bronze Border) */}
              <div
                className="gcl-podium-bronze p-4 flex flex-col items-center text-center w-full sm:w-[200px] md:w-[220px] transition-all"
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
                    {edition.thirdPlace?.name || '—'}
                  </h3>
                  <p className="text-xs text-[#8a8a93] mt-0.5 font-sans">Third place</p>
                  <p className="text-xs text-[#8a8a93] font-mono mt-0.5">
                    {thirdStats.itemsBought} lots · {formatCurrency(thirdStats.amountSpent)}
                  </p>
                </div>
                {edition.third_place_team_id && (
                  <Link
                    to={`/teams/${edition.third_place_team_id}`}
                    className="mt-3 gcl-btn-outline-red px-3.5 py-1 text-xs"
                  >
                    View profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPUTED REAL STATISTICS & BREAKDOWN */}
        {stats && edition?.is_archived && (
          <section className="gcl-card-crimson p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-[#ff4d5a]" />
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Verified Edition Metrics
                </h2>
              </div>
              <span className="text-xs font-mono text-[#9a9aa3] uppercase">
                Tamper-Evident Archive Record
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {stats.teamsCount}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Competing Teams
                </div>
              </div>

              <div className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-black text-[#ff4d5a] font-mono">
                  {stats.participantsCount}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Participants
                </div>
              </div>

              <div className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-black text-[#f4f4f6] font-mono">
                  {stats.roundsPlayed}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Auction Rounds
                </div>
              </div>

              <div className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-5 text-center">
                <div className="text-3xl sm:text-4xl font-black text-[#3fe085] font-mono">
                  {stats.totalCertificates}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Certificates Issued
                </div>
              </div>
            </div>

            {/* Certificate Breakdown */}
            {stats.certificateBreakdown.length > 0 && (
              <div className="pt-4 border-t border-[#26262c]">
                <span className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] block mb-3 font-bold">
                  Official Certificate Type Breakdown
                </span>
                <div className="flex flex-wrap gap-2">
                  {stats.certificateBreakdown.map((item) => (
                    <div
                      key={item.type}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0e0e14] border border-[#22222a] flex items-center gap-2 text-xs font-mono"
                    >
                      <span className="font-bold text-[#ff4d5a]">{item.count}</span>
                      <span className="text-[#a1a1aa] capitalize">
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* EVENT TIMELINE */}
        <section className="gcl-card-crimson p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-[#ff4d5a]" />
            <h2 className="text-xl font-black text-white uppercase tracking-wide">
              Tournament Progression Timeline
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { step: '01', title: 'Registration', desc: 'Team Formation & Verification' },
              { step: '02', title: 'Round 1 (20L)', desc: 'Web Dev, Basics & Git' },
              { step: '03', title: 'Round 2 (30L)', desc: 'DSA, SQL & Networks' },
              { step: '04', title: 'Round 3 (50L)', desc: 'System Design & Architecture' },
              { step: '05', title: 'Finale & Podium', desc: 'Sudden Death & Champions' },
            ].map((st, i) => (
              <div
                key={i}
                className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-4 space-y-1.5"
              >
                <span className="text-xs font-mono text-[#ff4d5a] font-bold tracking-wider">
                  STAGE {st.step}
                </span>
                <h4 className="font-bold text-white text-base leading-snug">{st.title}</h4>
                <p className="text-xs text-[#9a9aa3] leading-relaxed font-sans">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FULL FINAL STANDINGS TABLE (MATCHING USER SCREENSHOT) */}
        <section className="gcl-card-crimson p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              Final standings
            </h2>
            <span className="text-xs text-[#8a8a93] font-sans">
              Select a team to open its profile
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <table
              style={{
                width: '100%',
                minWidth: '680px',
                borderCollapse: 'separate',
                borderSpacing: '0 6px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    height: '32px',
                    color: '#8a8a93',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <th style={{ width: '48px', textAlign: 'center', padding: '0 8px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0 12px' }}>Team</th>
                  <th style={{ width: '100px', textAlign: 'left', padding: '0 12px' }}>Lots</th>
                  <th style={{ width: '260px', textAlign: 'left', padding: '0 12px' }}>Spent</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '0 16px' }}>Remaining</th>
                  <th style={{ width: '90px', textAlign: 'center', padding: '0 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((t, idx) => {
                  const teamStat = getTeamStats(t.id);
                  const isWinner = idx === 0;
                  const remainingBudget = t.budget ?? 150000000;
                  const totalBudget = (teamStat.amountSpent + remainingBudget) || 150000000;
                  const pct = Math.min(100, Math.max(3, Math.round((teamStat.amountSpent / totalBudget) * 100)));

                  return (
                    <tr
                      key={t.id}
                      className={isWinner ? 'gcl-standings-row-winner' : 'gcl-standings-row'}
                      style={{ height: '44px' }}
                    >
                      {/* Rank # */}
                      <td style={{ textAlign: 'center', padding: '0 8px' }}>
                        {isWinner ? (
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #ff2a38',
                              color: '#ff4d5a',
                              background: 'rgba(255, 42, 61, 0.12)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              fontFamily: "'Rajdhani', sans-serif",
                              boxShadow: '0 0 8px rgba(255, 42, 61, 0.35)',
                            }}
                          >
                            1
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #262630',
                              color: '#a0a0ab',
                              background: '#16161c',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              fontFamily: "'Rajdhani', sans-serif",
                            }}
                          >
                            {idx + 1}
                          </div>
                        )}
                      </td>

                      {/* Team Name — White font, NEVER browser blue */}
                      <td style={{ padding: '0 12px' }}>
                        <Link
                          to={`/teams/${t.id}`}
                          className="gcl-team-name-link font-bold hover:text-[#ff6b78] transition-colors"
                          style={{
                            color: '#f5f5f7',
                            fontFamily: "'Barlow Semi Condensed', 'Rajdhani', sans-serif",
                            fontWeight: 600,
                            fontSize: '15px',
                            textDecoration: 'none',
                          }}
                        >
                          {t.name}
                        </Link>
                      </td>

                      {/* Lots Won */}
                      <td style={{ padding: '0 12px', fontSize: '13px', color: '#f4f4f6', fontFamily: "'Inter', sans-serif" }}>
                        {teamStat.itemsBought} lots
                      </td>

                      {/* Spent with Progress Bar */}
                      <td style={{ padding: '0 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              flex: 1,
                              maxWidth: '140px',
                              height: '5px',
                              background: '#1c1c24',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #ff2a38, #e8212e)',
                                borderRadius: '9999px',
                                boxShadow: '0 0 8px rgba(232, 33, 46, 0.7)',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              color: '#ff4d5a',
                              fontWeight: 700,
                              fontSize: '13px',
                              fontFamily: "'Rajdhani', monospace, sans-serif",
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(teamStat.amountSpent)}
                          </span>
                        </div>
                      </td>

                      {/* Remaining Budget */}
                      <td style={{ textAlign: 'right', padding: '0 16px' }}>
                        <span
                          style={{
                            color: '#3fe085',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: "'Rajdhani', monospace, sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatCurrency(remainingBudget)}
                        </span>
                      </td>

                      {/* Profile Button */}
                      <td style={{ textAlign: 'center', padding: '0 8px' }}>
                        <Link
                          to={`/teams/${t.id}`}
                          className="gcl-btn-outline-red"
                          style={{
                            padding: '4px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '6px',
                          }}
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SPONSORS & PARTNERS */}
        {sponsors.length > 0 && (
          <section className="gcl-card-crimson p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#ffd700]" />
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                Official Edition Sponsors & Partners
              </h2>
            </div>

            <div className="space-y-6">
              {Object.entries(sponsorsByTier).map(([tier, sponsorList]) => (
                <div key={tier} className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#9a9aa3] font-bold">
                    {tier}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {sponsorList.map((sp) => (
                      <div
                        key={sp.id}
                        className="bg-[#0e0e14] border border-[#22222a] hover:border-[#ff2a38]/40 transition-all rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2"
                      >
                        {sp.logo_url ? (
                          <img
                            src={sp.logo_url}
                            alt={sp.name}
                            className="max-h-12 max-w-full object-contain filter grayscale hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <div className="h-12 flex items-center justify-center font-bold text-xs text-[#9a9aa3]">
                            {sp.name}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-[#f4f4f6]">
                          {sp.name}
                        </span>
                        {sp.website_url && (
                          <a
                            href={sp.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#ff4d5a] hover:underline font-mono"
                          >
                            Website
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
