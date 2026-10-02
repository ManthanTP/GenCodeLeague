import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ChevronLeft,
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import {
  fetchEditionComputedStats,
  type EditionComputedStats,
} from '../utils/archiveUtils';
import { formatCurrency } from '../utils/formatters';
import type { Edition, Team, Sponsor, GalleryPhoto } from '../types/database';

interface EditionWithPodium extends Edition {
  champion?: Team | null;
  runnerUp?: Team | null;
  thirdPlace?: Team | null;
}

export default function EditionDetail() {
  const { editionId } = useParams<{ editionId: string }>();
  const [edition, setEdition] = useState<EditionWithPodium | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
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
        const { data: edData } = await supabase
          .from('editions')
          .select(`
            *,
            champion:teams!editions_champion_team_id_fkey(id, name),
            runnerUp:teams!editions_runner_up_team_id_fkey(id, name),
            thirdPlace:teams!editions_third_place_team_id_fkey(id, name)
          `)
          .eq('id', editionId)
          .single();

        setEdition(edData as unknown as EditionWithPodium);

        // 2. Fetch Teams & Standings
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', editionId)
          .order('score', { ascending: false });

        setTeams(teamsData || []);

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

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[var(--accent-red)] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/hall-of-fame"
            className="flex items-center gap-2 text-sm text-[#71717a] hover:text-[var(--accent-red)] transition-colors"
          >
            <ChevronLeft size={16} /> Back to Hall of Fame
          </Link>

          {edition?.is_archived && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 uppercase">
              ARCHIVED HISTORICAL RECORD
            </span>
          )}
        </div>

        {/* Hero Banner */}
        <div className="bg-[#131316] border-l-4 border-l-[var(--accent-red)] border-y border-r border-[#26262b] rounded-2xl p-6 sm:p-10 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--accent-red)] uppercase tracking-widest font-bold">
                Edition Retrospective
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white mt-1">
                {edition?.name || 'GenCode League'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/gallery?edition=${edition?.id}`}
                className="px-4 py-2 rounded-xl bg-[#18181c] hover:bg-[#202025] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#26262b] text-[#e1e1e6]"
              >
                <Image size={15} /> Event Gallery
              </Link>
              <Link
                to={`/my-certificates?edition=${edition?.id}`}
                className="px-4 py-2 rounded-xl bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(224,38,63,0.3)]"
              >
                <FileText size={15} /> Issued Certificates
              </Link>
            </div>
          </div>

          <p className="text-sm text-[#a1a1aa] max-w-2xl">
            Complete event record, final standings, verified statistics, and official sponsor recognitions.
          </p>
        </div>

        {/* PODIUM SECTION */}
        {edition && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Crown size={22} className="text-[#d4af37]" />
              Podium Finishers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Champion */}
              <div className="order-1 md:order-2 p-6 rounded-2xl bg-[#131316] border-2 border-[#d4af37]/70 shadow-[0_0_24px_rgba(212,175,55,0.12)] flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] mb-3 shadow-[0_0_12px_rgba(212,175,55,0.25)]">
                  <Crown size={32} />
                </div>
                <span className="text-xs font-black tracking-widest text-[#d4af37] uppercase font-mono">
                  1ST PLACE • GRAND CHAMPION
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {edition.champion?.name || 'TBD'}
                </h3>
                {edition.champion?.id && (
                  <Link
                    to={`/teams/${edition.champion.id}`}
                    className="mt-3 text-xs text-[#d4af37] hover:underline flex items-center gap-1 font-mono"
                  >
                    View Team Profile →
                  </Link>
                )}
              </div>

              {/* Runner Up */}
              <div className="order-2 md:order-1 p-6 rounded-2xl bg-[#131316] border border-[#26262b] shadow-xl flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-[#18181c] border border-[#71717a] flex items-center justify-center text-[#a1a1aa] mb-3">
                  <Medal size={26} />
                </div>
                <span className="text-xs font-bold tracking-widest text-[#a1a1aa] uppercase font-mono">
                  2ND PLACE • RUNNER UP
                </span>
                <h3 className="text-xl font-bold text-[#e1e1e6] mt-1">
                  {edition.runnerUp?.name || 'TBD'}
                </h3>
                {edition.runnerUp?.id && (
                  <Link
                    to={`/teams/${edition.runnerUp.id}`}
                    className="mt-3 text-xs text-[#71717a] hover:text-white hover:underline flex items-center gap-1 font-mono"
                  >
                    View Team Profile →
                  </Link>
                )}
              </div>

              {/* Third Place */}
              <div className="order-3 p-6 rounded-2xl bg-[#131316] border border-[#26262b] shadow-xl flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-[#18181c] border border-[#a87140] flex items-center justify-center text-[#cd7f32] mb-3">
                  <Award size={26} />
                </div>
                <span className="text-xs font-bold tracking-widest text-[#cd7f32] uppercase font-mono">
                  3RD PLACE
                </span>
                <h3 className="text-xl font-bold text-[#e1e1e6] mt-1">
                  {edition.thirdPlace?.name || 'TBD'}
                </h3>
                {edition.thirdPlace?.id && (
                  <Link
                    to={`/teams/${edition.thirdPlace.id}`}
                    className="mt-3 text-xs text-[#cd7f32] hover:underline flex items-center gap-1 font-mono"
                  >
                    View Team Profile →
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* COMPUTED REAL STATISTICS & BREAKDOWN */}
        {stats && edition?.is_archived && (
          <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <TrendingUp size={20} className="text-[var(--accent-red)]" />
              Verified Edition Metrics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] text-center">
                <div className="text-3xl font-black text-white font-mono">
                  {stats.teamsCount}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mt-1">
                  Competing Teams
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] text-center">
                <div className="text-3xl font-black text-[var(--accent-red)] font-mono">
                  {stats.participantsCount}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mt-1">
                  Participants
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] text-center">
                <div className="text-3xl font-black text-[#e1e1e6] font-mono">
                  {stats.roundsPlayed}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mt-1">
                  Auction Rounds
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] text-center">
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {stats.totalCertificates}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] mt-1">
                  Certificates Issued
                </div>
              </div>
            </div>

            {/* Certificate Breakdown */}
            {stats.certificateBreakdown.length > 0 && (
              <div className="pt-4 border-t border-[#202024]">
                <span className="text-xs uppercase font-mono tracking-wider text-[#71717a] block mb-3 font-bold">
                  Official Certificate Type Breakdown
                </span>
                <div className="flex flex-wrap gap-2">
                  {stats.certificateBreakdown.map((item) => (
                    <div
                      key={item.type}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024] flex items-center gap-2 text-xs font-mono"
                    >
                      <span className="font-bold text-[var(--accent-red)]">{item.count}</span>
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
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Clock size={20} className="text-[var(--accent-red)]" />
            Tournament Progression Timeline
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
            {[
              { step: '01', title: 'Registration', desc: 'External Google Form verification' },
              { step: '02', title: 'Round 1 (20L)', desc: 'Web Dev, Basics & Git' },
              { step: '03', title: 'Round 2 (30L)', desc: 'DSA, SQL & Networks' },
              { step: '04', title: 'Round 3 (50L)', desc: 'System Design & Architecture' },
              { step: '05', title: 'Finale & Podium', desc: 'Sudden Death & Champions' },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] space-y-1">
                <span className="text-[10px] font-mono text-[var(--accent-red)] font-bold tracking-wider">
                  STAGE {st.step}
                </span>
                <h4 className="font-bold text-white text-sm">{st.title}</h4>
                <p className="text-[11px] text-[#71717a]">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FULL FINAL STANDINGS TABLE */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202024]">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Trophy size={20} className="text-[#d4af37]" />
                Final Standings
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                Official final competition standings across all rounds
              </p>
            </div>
            <span className="text-xs font-mono text-[#71717a]">
              {teams.length} Teams
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#202024] text-[#71717a] font-mono uppercase">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Team Name</th>
                  <th className="py-3 px-3 text-right">Budget Left</th>
                  <th className="py-3 px-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c21] font-sans">
                {teams.map((t, index) => {
                  const rankNum = index + 1;
                  const rankColor =
                    rankNum === 1
                      ? 'text-[#d4af37]'
                      : rankNum === 2
                      ? 'text-[#a1a1aa]'
                      : rankNum === 3
                      ? 'text-[#cd7f32]'
                      : 'text-[#71717a]';

                  return (
                    <tr key={t.id} className="hover:bg-[#18181c]/60 transition-colors">
                      <td className={`py-3 px-3 font-mono font-bold ${rankColor}`}>
                        #{rankNum}
                      </td>
                      <td className="py-3 px-3 font-bold text-white text-sm">
                        <Link to={`/teams/${t.id}`} className="hover:text-[var(--accent-red)] transition-colors">
                          {t.name}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {formatCurrency(t.budget)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/teams/${t.id}`}
                          className="text-xs text-[var(--accent-red)] hover:underline font-mono"
                        >
                          View Profile →
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
          <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={20} className="text-[#d4af37]" />
              Official Edition Sponsors & Partners
            </h2>

            <div className="space-y-6">
              {Object.entries(sponsorsByTier).map(([tier, sponsorList]) => (
                <div key={tier} className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#71717a] font-bold">
                    {tier}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {sponsorList.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] flex flex-col items-center justify-center text-center space-y-2"
                      >
                        {sp.logo_url ? (
                          <img
                            src={sp.logo_url}
                            alt={sp.name}
                            className="max-h-12 max-w-full object-contain filter grayscale hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <div className="h-12 flex items-center justify-center font-bold text-xs text-[#71717a]">
                            {sp.name}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-[#e1e1e6]">
                          {sp.name}
                        </span>
                        {sp.website_url && (
                          <a
                            href={sp.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[var(--accent-red)] hover:underline font-mono"
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
