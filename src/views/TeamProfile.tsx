import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Trophy,
  Award,
  ChevronLeft,
  Crown,
  Medal,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Package,
  Wallet,
  Coins,
  History,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { formatCurrency } from '../utils/formatters';
import type { Team, TeamMember, Edition, TeamItem } from '../types/database';
import type { Certificate } from '../types/certificates';

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [items, setItems] = useState<TeamItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [podiumPosition, setPodiumPosition] = useState<'1st' | '2nd' | '3rd' | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!teamId) return;

    async function loadTeamData() {
      setLoading(true);
      try {
        // 1. Fetch team details directly without relational ambiguity
        const { data: teamData, error: teamErr } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();

        if (teamErr) {
          console.error('Error fetching team:', teamErr);
          setLoading(false);
          return;
        }

        setTeam(teamData);

        // 2. Fetch edition details
        if (teamData?.edition_id) {
          const { data: edData } = await supabase
            .from('editions')
            .select('*')
            .eq('id', teamData.edition_id)
            .single();

          if (edData) {
            setEdition(edData);
            if (edData.champion_team_id === teamId) {
              setPodiumPosition('1st');
            } else if (edData.runner_up_team_id === teamId) {
              setPodiumPosition('2nd');
            } else if (edData.third_place_team_id === teamId) {
              setPodiumPosition('3rd');
            }
          }
        }

        // 3. Fetch team members sorted by created_at (first entered is captain)
        const { data: membersData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true });

        setMembers(membersData || []);

        // 4. Fetch items won by this team
        const { data: itemsData } = await supabase
          .from('team_items')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        setItems(itemsData || []);

        // 5. Fetch certificates issued to this team
        const { data: certsData } = await supabase
          .from('certificates')
          .select('*')
          .eq('team_id', teamId)
          .order('issued_at', { ascending: false });

        setCertificates((certsData as unknown as Certificate[]) || []);
      } catch (err) {
        console.error('Failed to load team profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTeamData();
  }, [teamId]);

  // Total spent calculation
  const totalSpent = items.reduce((acc, it) => acc + (it.cost || 0), 0);
  const remainingBudget = team?.budget ?? 0;
  const initialBudget = totalSpent + remainingBudget;

  // Designate Captain: If any member has is_captain, that's captain; otherwise the FIRST entered member is captain
  const designatedMembers = React.useMemo(() => {
    if (!members || members.length === 0) return [];
    const hasExplicitCaptain = members.some((m) => m.is_captain);

    return members.map((m, idx) => ({
      ...m,
      isCaptain: hasExplicitCaptain ? Boolean(m.is_captain) : idx === 0,
    })).sort((a, b) => {
      if (a.isCaptain && !b.isCaptain) return -1;
      if (!a.isCaptain && b.isCaptain) return 1;
      return 0;
    });
  }, [members]);

  return (
    <div className="gcl-live-page min-h-screen text-white font-sans selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={edition?.id ? `/editions/${edition.id}` : '/hall-of-fame'}
            className="flex items-center gap-2 text-xs font-mono text-[#9a9aa3] hover:text-[#ff4d5a] transition-colors"
          >
            <ChevronLeft size={16} /> Back to {edition?.name || 'Hall of Fame'}
          </Link>

          <span className="text-xs font-mono text-[#ff4d5a] uppercase tracking-wider font-semibold">
            OFFICIAL TEAM RECORD
          </span>
        </div>

        {/* Team Profile Header Banner with Cyber Styling */}
        <div className="bg-[#131316] border-l-4 border-l-[#e8212e] border-y border-r border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[#ff4d5a] uppercase tracking-widest block font-bold">
                {edition?.name || 'GenCode League'} • {edition?.year || 2025}
              </span>
              <h1
                className="text-3xl sm:text-5xl font-black text-white mt-1 uppercase"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {team?.name || 'Team Profile'}
              </h1>
            </div>

            {/* Podium Placement Badge */}
            {podiumPosition && (
              <div
                className={`px-5 py-3 rounded-2xl border text-center ${
                  podiumPosition === '1st'
                    ? 'bg-[#d4af37]/15 border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                    : podiumPosition === '2nd'
                    ? 'bg-slate-800/40 border-slate-500'
                    : 'bg-amber-950/30 border-amber-600'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  {podiumPosition === '1st' && <Crown size={18} className="text-[#fbbf24]" />}
                  {podiumPosition === '2nd' && <Medal size={18} className="text-slate-300" />}
                  {podiumPosition === '3rd' && <Award size={18} className="text-amber-500" />}
                  <span
                    className={`text-[10px] font-mono uppercase font-black tracking-widest ${
                      podiumPosition === '1st'
                        ? 'text-[#fbbf24]'
                        : podiumPosition === '2nd'
                        ? 'text-slate-300'
                        : 'text-amber-400'
                    }`}
                  >
                    Official Podium
                  </span>
                </div>
                <span
                  className="text-2xl font-black text-white font-mono tracking-tight"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {podiumPosition === '1st'
                    ? '1ST PLACE'
                    : podiumPosition === '2nd'
                    ? '2ND PLACE'
                    : '3RD PLACE'}
                </span>
              </div>
            )}
          </div>

          {/* Tournament Metrics Row (No numerical marks/scores) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#26262b]">
            <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b]">
              <span className="text-[10px] font-mono uppercase text-[#9a9aa3] block">
                Items / Lots Won
              </span>
              <strong
                className="text-xl font-black text-[#ff4d5a] font-mono block mt-0.5"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {items.length} Lots
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b]">
              <span className="text-[10px] font-mono uppercase text-[#9a9aa3] block">
                Total Spent
              </span>
              <strong
                className="text-xl font-black text-rose-400 font-mono block mt-0.5"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {formatCurrency(totalSpent)}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b]">
              <span className="text-[10px] font-mono uppercase text-[#9a9aa3] block">
                Remaining Budget
              </span>
              <strong
                className="text-xl font-black text-emerald-400 font-mono block mt-0.5"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {formatCurrency(remainingBudget)}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b]">
              <span className="text-[10px] font-mono uppercase text-[#9a9aa3] block">
                Starting Purse
              </span>
              <strong
                className="text-xl font-black text-white font-mono block mt-0.5"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {formatCurrency(initialBudget > 0 ? initialBudget : 150000000)}
              </strong>
            </div>
          </div>
        </div>

        {/* TEAM MEMBERS & CAPTAIN ROSTER */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#26262b]">
            <h2
              className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              <Users size={20} className="text-[#ff4d5a]" />
              Team Roster & Leadership
            </h2>
            <span className="text-xs font-mono text-[#9a9aa3]">
              {designatedMembers.length} Registered Member(s)
            </span>
          </div>

          {designatedMembers.length === 0 ? (
            <p className="text-xs text-[#9a9aa3] italic py-4">
              Individual members have not been enumerated for this team record.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {designatedMembers.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl transition-all space-y-2 relative overflow-hidden ${
                    member.isCaptain
                      ? 'bg-gradient-to-b from-[#2a2208]/40 via-[#18181c] to-[#131316] border-2 border-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.25)]'
                      : 'bg-[#18181c] border border-[#26262b]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-bold text-base truncate ${
                        member.isCaptain ? 'text-[#fbbf24]' : 'text-white'
                      }`}
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {member.name || member.full_name}
                    </span>

                    {member.isCaptain && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#d4af37]/20 text-[#fbbf24] border border-[#d4af37]/50 shadow-[0_0_8px_rgba(212,175,55,0.3)] inline-flex items-center gap-1 uppercase shrink-0">
                        <Crown size={11} /> CAPTAIN
                      </span>
                    )}
                  </div>

                  {member.college && (
                    <div className="text-[11px] text-[#9a9aa3] truncate">
                      {member.college}
                    </div>
                  )}
                  {member.department && (
                    <div className="text-[10px] font-mono text-[#71717a]">
                      Dept: {member.department}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACQUIRED AUCTION ITEMS / LOTS WON */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#26262b]">
            <h2
              className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              <Package size={20} className="text-[#ff4d5a]" />
              Acquired Auction Lots ({items.length})
            </h2>
            <span className="text-xs font-mono text-[#9a9aa3]">
              Total Investment: <strong className="text-rose-400 font-bold">{formatCurrency(totalSpent)}</strong>
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-[#9a9aa3] italic py-6 text-center">
              No auction items recorded for this team.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262b] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[#ff4d5a] uppercase font-bold block">
                      {it.question_ref || `Round ${(it.round_index ?? 0) + 1} - Question ${(it.question_index ?? 0) + 1}`}
                    </span>
                    <h4
                      className="font-bold text-white text-sm truncate mt-0.5"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {it.item_name || 'Auction Lot'}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-[#9a9aa3] block uppercase">
                      Gavel Drop
                    </span>
                    <strong className="text-sm font-mono font-bold text-rose-400">
                      {formatCurrency(it.cost)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ISSUED CERTIFICATES */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#26262b]">
            <h2
              className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              <Award size={20} className="text-[#fbbf24]" />
              Official Certificates Issued ({certificates.length})
            </h2>
          </div>

          {certificates.length === 0 ? (
            <p className="text-xs text-[#9a9aa3] italic py-6 text-center">
              No certificates recorded for this team.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl bg-[#18181c] border border-[#26262b] flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#fbbf24] block">
                      {cert.certificate_id}
                    </span>
                    <h4
                      className="font-bold text-white text-base"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {cert.recipient_name}
                    </h4>
                    <span className="text-xs text-[#ff4d5a] capitalize font-medium">
                      {cert.certificate_type.replace('_', ' ')}
                    </span>
                  </div>

                  <Link
                    to={`/verify/${cert.certificate_id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-[#131316] hover:bg-[#202025] text-xs font-semibold text-[#e1e1e6] flex items-center gap-1.5 transition-colors border border-[#26262b] shrink-0 font-mono"
                  >
                    Verify <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
