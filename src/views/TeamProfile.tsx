import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Award,
  ChevronLeft,
  ChevronDown,
  Medal,
  Package,
  Wallet,
  Coins,
  Copy,
  Check,
  Trophy,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { formatCurrency } from '../utils/formatters';
import type { Team, TeamMember, Edition, TeamItem } from '../types/database';
import type { Certificate } from '../types/certificates';

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [allEditionTeams, setAllEditionTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [items, setItems] = useState<TeamItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [podiumPosition, setPodiumPosition] = useState<'1st' | '2nd' | '3rd' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!teamId) return;

    async function loadTeamData() {
      setLoading(true);
      try {
        // 1. Fetch team details
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

        // 2. Fetch edition details and all sibling teams
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
            } else {
              setPodiumPosition(null);
            }
          }

          // Fetch all teams for this edition
          const { data: siblings } = await supabase
            .from('teams')
            .select('*')
            .eq('edition_id', teamData.edition_id)
            .order('sort_order', { ascending: true });

          setAllEditionTeams(siblings || []);
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
  const initialBudget = totalSpent + remainingBudget > 0 ? totalSpent + remainingBudget : 150000000;
  const spentPercent = Math.min(100, Math.round((totalSpent / initialBudget) * 100));

  // Designate Captain: If any member has is_captain, that's captain; otherwise the FIRST entered member is captain
  const designatedMembers = React.useMemo(() => {
    if (!members || members.length === 0) return [];
    const hasExplicitCaptain = members.some((m) => m.is_captain);

    return members
      .map((m, idx) => ({
        ...m,
        isCaptain: hasExplicitCaptain ? Boolean(m.is_captain) : idx === 0,
      }))
      .sort((a, b) => {
        if (a.isCaptain && !b.isCaptain) return -1;
        if (!a.isCaptain && b.isCaptain) return 1;
        return 0;
      });
  }, [members]);

  const captain = designatedMembers.find((m) => m.isCaptain) || designatedMembers[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setNotification({
      type: 'success',
      msg: 'Team profile URL copied to clipboard!',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={edition?.id ? `/editions/${edition.id}` : '/hall-of-fame'}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8a8a93] hover:text-[#ff4d5a] transition-colors"
          >
            <ChevronLeft size={16} /> Back to {edition?.name || 'Hall of Fame'}
          </Link>

          <span className="text-xs font-mono text-[#ff4d5a] uppercase tracking-wider font-semibold">
            OFFICIAL TEAM RECORD
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#8a8a93]">
            <div className="w-10 h-10 border-4 border-[#e8212e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono">Loading team record...</p>
          </div>
        ) : !team ? (
          <div className="py-20 text-center gcl-card-crimson p-8 rounded-2xl">
            <Trophy size={48} className="text-[#3a3a41] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">Team Record Not Found</h3>
            <p className="text-xs text-[#8a8a93] mt-1 font-sans">
              The requested team profile could not be located in tournament archives.
            </p>
          </div>
        ) : (
          <div className="gcl-two-col-layout">
            {/* LEFT MAIN CONTENT COLUMN */}
            <div className="space-y-6 min-w-0">
              {/* CARD 1: TEAM HEADER BANNER */}
              <div className="gcl-card-crimson card--sheen p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-[#8a8a93] block">
                    {edition?.name || 'GCL 2025'} • Team profile
                  </span>
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    {team.name}
                  </h1>
                </div>

                {/* Placement Badge (Matches Image 2 #1 Grand Champion Pill) */}
                {podiumPosition && (
                  <div className="gcl-badge-gold-champion shrink-0 self-start sm:self-auto">
                    {podiumPosition === '1st' ? (
                      <Award size={24} className="text-[#eab308]" />
                    ) : podiumPosition === '2nd' ? (
                      <Medal size={24} className="text-slate-200" />
                    ) : (
                      <Award size={24} className="text-[#f97316]" />
                    )}
                    <div>
                      <div className="text-sm font-black font-mono leading-none">
                        {podiumPosition === '1st'
                          ? '#1'
                          : podiumPosition === '2nd'
                          ? '#2'
                          : '#3'}
                      </div>
                      <div className="text-[10px] text-[#eab308] font-sans font-medium uppercase tracking-wider mt-0.5">
                        {podiumPosition === '1st'
                          ? 'Winner (Champion)'
                          : podiumPosition === '2nd'
                          ? 'Runner-up'
                          : 'Third place'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ROW OF 3 STAT CARDS (Matches Image 2 with Glowing Crimson Border) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Lots won */}
                <div className="gcl-card-crimson p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#261014] border border-[#e8212e]/40 flex items-center justify-center text-[#ff4d5a] shrink-0">
                    <Package size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-[#8a8a93] font-sans block">Lots won</span>
                    <strong
                      className="text-2xl font-black text-white font-mono block mt-0.5"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {items.length}
                    </strong>
                  </div>
                </div>

                {/* Total spent (Red Number text) */}
                <div className="gcl-card-crimson p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#261014] border border-[#e8212e]/40 flex items-center justify-center text-[#ff4d5a] shrink-0">
                    <Coins size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-[#8a8a93] font-sans block">Total spent</span>
                    <strong
                      className="text-2xl font-black text-[#ff4d5a] font-mono block mt-0.5"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {formatCurrency(totalSpent)}
                    </strong>
                  </div>
                </div>

                {/* Remaining (Green Number text) */}
                <div className="gcl-card-crimson p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#102418] border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e] shrink-0">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-[#8a8a93] font-sans block">Remaining</span>
                    <strong
                      className="text-2xl font-black text-[#22c55e] font-mono block mt-0.5"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {formatCurrency(remainingBudget)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CARD 2: BUDGET USED PROGRESS (Glowing red bar) */}
              <div className="gcl-card-crimson p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className="font-bold text-white tracking-wide text-sm"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Budget used
                  </span>
                  <span className="text-[#8a8a93] font-mono text-xs">
                    {spentPercent}% of {formatCurrency(initialBudget)}
                  </span>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="gcl-progress-track">
                  <div
                    className="gcl-progress-fill-red"
                    style={{ width: `${spentPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-[#ff4d5a] font-bold">Spent: {formatCurrency(totalSpent)}</span>
                  <span className="text-[#22c55e] font-bold">{formatCurrency(remainingBudget)} left</span>
                </div>
              </div>

              {/* CARD 3: LOTS WON (N) */}
              <div className="gcl-card-crimson p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#22222a]">
                  <h2
                    className="text-base font-bold text-white tracking-wide"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Lots won ({items.length})
                  </h2>
                  <span className="text-xs text-[#ff4d5a] font-mono font-bold">
                    Total: {formatCurrency(totalSpent)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-[#8a8a93] italic py-4 text-center font-sans">
                    No auction lots recorded for this team.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="bg-[#0e0e14] border border-[#22222a] hover:border-[#e8212e]/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="gcl-badge-square-red">
                            {idx + 1}
                          </div>
                          <div>
                            <h4
                              className="font-bold text-white text-sm"
                              style={{ fontFamily: "'Rajdhani', sans-serif" }}
                            >
                              {it.item_name || `Lot #${idx + 1} — ${team.name}`}
                            </h4>
                            <span className="text-[11px] text-[#8a8a93] font-mono block">
                              Round {(it.round_index ?? 0) + 1}
                            </span>
                          </div>
                        </div>

                        <span className="text-sm font-bold font-mono text-[#ff4d5a] whitespace-nowrap">
                          {formatCurrency(it.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CARD 4: CERTIFICATES (N) */}
              <div className="gcl-card-crimson p-5 sm:p-6 space-y-4">
                <div className="pb-2 border-b border-[#22222a]">
                  <h2
                    className="text-base font-bold text-white tracking-wide"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Certificates ({certificates.length})
                  </h2>
                </div>

                {certificates.length === 0 ? (
                  <p className="text-xs text-[#8a8a93] italic py-4 text-center font-sans">
                    No certificates issued for this team yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="bg-[#0e0e14] border border-[#22222a] hover:border-[#e8212e]/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <h4
                            className="font-bold text-white text-sm"
                            style={{ fontFamily: "'Rajdhani', sans-serif" }}
                          >
                            {cert.recipient_name}
                          </h4>
                          <span className="text-[11px] text-[#8a8a93] font-mono block mt-0.5">
                            {cert.certificate_type === 'winner' ? 'Winner' : 'Participant'} •{' '}
                            {edition?.name || 'GCL 2025'}
                          </span>
                        </div>

                        <Link
                          to={`/verify/${cert.certificate_id}`}
                          target="_blank"
                          className="gcl-btn-outline-red px-3.5 py-1 text-xs shrink-0"
                        >
                          Verify
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR COLUMN ("Selected team") */}
            <div className="space-y-4 w-full">
              <div className="gcl-card-crimson p-5 sm:p-6 space-y-5">
                <h3
                  className="text-base font-bold text-white tracking-wide"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Selected team
                </h3>

                {/* Team Dropdown Selector */}
                {allEditionTeams.length > 0 && (
                  <div className="relative">
                    <select
                      value={team.id}
                      onChange={(e) => navigate(`/teams/${e.target.value}`)}
                      className="w-full appearance-none bg-[#111116] border border-[#24242e] text-white rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono focus:outline-none focus:border-[#e8212e] pr-9 cursor-pointer"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {allEditionTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a93] pointer-events-none"
                    />
                  </div>
                )}

                {/* Team Identity Card */}
                <div className="bg-[#0e0e14] border border-[#22222a] rounded-xl p-3.5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7a181f] to-[#1c0c11] border border-[#e8212e]/50 flex items-center justify-center text-lg shrink-0">
                    🦁
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="font-bold text-white text-sm truncate"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      {team.name}
                    </h4>
                    <p className="text-xs text-[#8a8a93] truncate font-sans">
                      Leader: {captain?.name || captain?.full_name || 'Afifa Naaz M Susiwale'}
                    </p>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono text-[#8a8a93] font-bold block">
                    Team members ({designatedMembers.length})
                  </span>

                  {designatedMembers.length === 0 ? (
                    <p className="text-xs text-[#8a8a93] italic py-2 font-sans">
                      No members enumerated.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {designatedMembers.map((member, idx) => (
                        <div
                          key={member.id || idx}
                          className="bg-[#0e0e14] border border-[#22222a] rounded-xl px-3.5 py-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[#8a8a93] font-mono text-[11px] w-4">
                              {idx + 1}
                            </span>
                            <span
                              className="font-bold text-white truncate"
                              style={{ fontFamily: "'Rajdhani', sans-serif" }}
                            >
                              {member.name || member.full_name}
                            </span>
                          </div>

                          {member.isCaptain && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/50 shrink-0">
                              Captain
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 gcl-btn-outline-red py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLink ? 'Copied' : 'Copy profile link'}
                  </button>

                  <Link
                    to="/hall-of-fame"
                    className="flex-1 gcl-btn-outline-red py-2 px-3 text-xs text-center"
                  >
                    View standings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
