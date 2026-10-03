import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Layers,
  FileText,
  Image,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
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
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/hall-of-fame"
            className="inline-flex items-center gap-2 text-sm text-[#9a9aa3] hover:text-[#ff4d5a] transition-colors font-bold uppercase tracking-wider"
          >
            <ChevronLeft size={16} /> Back to Hall of Fame
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

        {/* Hero Banner with Opposite-Corner Red Glow */}
        <div className="panel red relative overflow-hidden rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/gallery?edition=${edition?.id}`}
              className="px-4 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#25252d] text-xs font-bold flex items-center gap-2 transition-all border border-[#3e3e48] hover:border-[#ff4d5a] text-[#f4f4f6] uppercase tracking-wider"
            >
              <Image size={15} className="text-[#ff4d5a]" /> Event Gallery
            </Link>
            <Link
              to={`/certificates`}
              className="px-4 py-2.5 rounded-xl bg-[#2b0e13] hover:bg-[#3a1015] text-xs font-bold flex items-center gap-2 transition-all border border-[#e8212e]/70 text-[#ff4d5a] uppercase tracking-wider shadow-[0_0_14px_rgba(232,33,46,0.25)]"
            >
              <FileText size={15} /> Certificates
            </Link>
          </div>
        </div>

        {/* OFFICIAL 3D CYBER PODIUM TRIO (Gold 01, Silver 02, Bronze 03) */}
        {edition && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-[#ffd700]" />
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                Official Tournament Podium
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
              {/* 1st Place - GOLD (01) */}
              <div className="order-1 md:order-2 panel gold relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
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
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {edition.champion?.name || 'Team I – Jetha ke Jabaz'}
                </h3>

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
                    View Team Profile <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* 2nd Place - SILVER (02) */}
              <div className="order-2 md:order-1 panel silver relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
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
                <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
                  {edition.runnerUp?.name || 'Team N – TEAM SSVA'}
                </h3>

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
                    View Team Profile <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* 3rd Place - BRONZE / BROWN (03) */}
              <div className="order-3 panel bronze relative overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center">
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
                <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
                  {edition.thirdPlace?.name || 'Team M – Script Squad'}
                </h3>

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
                    View Team Profile <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* COMPUTED REAL STATISTICS & BREAKDOWN (Team View Background Combo) */}
        {stats && edition?.is_archived && (
          <section className="panel red p-6 sm:p-8 space-y-6">
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
              <div className="panel p-5 text-center" style={{ background: '#18181c', borderColor: '#25252b' }}>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {stats.teamsCount}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Competing Teams
                </div>
              </div>

              <div className="panel p-5 text-center" style={{ background: '#18181c', borderColor: '#25252b' }}>
                <div className="text-3xl sm:text-4xl font-black text-[#ff4d5a] font-mono">
                  {stats.participantsCount}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Participants
                </div>
              </div>

              <div className="panel p-5 text-center" style={{ background: '#18181c', borderColor: '#25252b' }}>
                <div className="text-3xl sm:text-4xl font-black text-[#f4f4f6] font-mono">
                  {stats.roundsPlayed}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] mt-1 font-bold">
                  Auction Rounds
                </div>
              </div>

              <div className="panel p-5 text-center" style={{ background: '#18181c', borderColor: '#25252b' }}>
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
                      className="px-3.5 py-1.5 rounded-lg bg-[#18181c] border border-[#26262b] flex items-center gap-2 text-xs font-mono"
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
        <section className="panel red p-6 sm:p-8 space-y-6">
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
              <div key={i} className="panel p-4 space-y-1.5" style={{ background: '#18181c', borderColor: '#25252b' }}>
                <span className="text-xs font-mono text-[#ff4d5a] font-bold tracking-wider">
                  STAGE {st.step}
                </span>
                <h4 className="font-bold text-white text-base leading-snug">{st.title}</h4>
                <p className="text-xs text-[#9a9aa3] leading-relaxed font-sans">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FULL FINAL STANDINGS TABLE (Exact LiveTeamStatus Table Style) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-[#ffd700]" />
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Official Final Standings
                </h2>
              </div>
              <p className="text-xs text-[#9a9aa3] mt-0.5 font-sans">
                Official final competition standings across all rounds
              </p>
            </div>
            <span className="text-xs font-mono text-[#ff4d5a] font-bold px-3 py-1 rounded bg-[rgba(232,33,46,0.14)] border border-[rgba(232,33,46,0.4)] w-fit">
              {teams.length} TEAMS REGISTERED
            </span>
          </div>

          <div
            className="panel red"
            style={{
              padding: '10px 14px',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '14px',
            }}
          >
            <div style={{ width: '100%', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0 2px',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      height: '34px',
                      background: '#1a1a1f',
                      borderRadius: '6px',
                      color: '#9a9aa3',
                      fontSize: '15px',
                      fontWeight: 600,
                      letterSpacing: '0.8px',
                      fontFamily: "'Rajdhani', sans-serif",
                    }}
                  >
                    <th style={{ width: '60px', textAlign: 'center', padding: '0 8px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0 14px' }}>TEAM NAME</th>
                    <th style={{ width: '130px', textAlign: 'center', padding: '0 12px' }}>ITEMS WON</th>
                    <th style={{ width: '180px', textAlign: 'right', padding: '0 14px' }}>TOTAL SPENT</th>
                    <th style={{ width: '180px', textAlign: 'right', padding: '0 14px' }}>REMAINING</th>
                    <th style={{ width: '100px', textAlign: 'center', padding: '0 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>PROFILE</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((t, idx) => {
                    const stats = getTeamStats(t.id);
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? '#18181d' : '#121216';

                    const is1st = t.id === edition?.champion_team_id;
                    const is2nd = t.id === edition?.runner_up_team_id;
                    const is3rd = t.id === edition?.third_place_team_id;

                    return (
                      <tr
                        key={t.id}
                        style={{
                          height: '36px',
                          background: rowBg,
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {/* Rank Badge */}
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '0 8px',
                            borderTopLeftRadius: '6px',
                            borderBottomLeftRadius: '6px',
                          }}
                        >
                          {is1st ? (
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
                          ) : is2nd ? (
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
                          ) : is3rd ? (
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
                            to={`/teams/${t.id}`}
                            className="font-bold text-white hover:text-[#ff4d5a] transition-colors"
                            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', letterSpacing: '0.02em' }}
                          >
                            {t.name}
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
                            {stats.itemsBought} Lots
                          </span>
                        </td>

                        {/* Amount Spent */}
                        <td style={{ textAlign: 'right', padding: '0 14px', fontWeight: 700, color: '#ff4d5a', fontSize: '15px' }}>
                          {formatCurrency(stats.amountSpent)}
                        </td>

                        {/* Remaining Budget */}
                        <td style={{ textAlign: 'right', padding: '0 14px', fontWeight: 700, color: '#3fe085', fontSize: '15px' }}>
                          {formatCurrency(t.budget)}
                        </td>

                        {/* Profile Button */}
                        <td style={{ textAlign: 'center', padding: '0 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>
                          <Link
                            to={`/teams/${t.id}`}
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
        </section>

        {/* SPONSORS & PARTNERS */}
        {sponsors.length > 0 && (
          <section className="panel red p-6 sm:p-8 space-y-6">
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
                        className="panel p-4 flex flex-col items-center justify-center text-center space-y-2"
                        style={{ background: '#18181c', borderColor: '#25252b' }}
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
