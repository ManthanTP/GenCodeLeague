import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Trophy,
  Award,
  ChevronLeft,
  Crown,
  ShieldCheck,
  Calendar,
  ExternalLink,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { formatCurrency } from '../utils/formatters';
import type { Team, TeamMember, Edition } from '../types/database';
import type { Certificate } from '../types/certificates';

interface TeamWithEdition extends Team {
  edition?: Edition | null;
  linkedTeam?: Team | null;
}

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<TeamWithEdition | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!teamId) return;

    async function loadTeamData() {
      setLoading(true);
      try {
        // 1. Fetch team details with edition and linked franchise
        const { data: teamData } = await supabase
          .from('teams')
          .select(`
            *,
            edition:editions(id, name, year, is_archived),
            linkedTeam:teams!teams_linked_team_id_fkey(id, name, edition_id)
          `)
          .eq('id', teamId)
          .single();

        setTeam(teamData as unknown as TeamWithEdition);

        // 2. Fetch team members
        const { data: membersData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);

        setMembers(membersData || []);

        // 3. Fetch rank in that edition
        if (teamData?.edition_id) {
          const { data: allEditionTeams } = await supabase
            .from('teams')
            .select('id, score')
            .eq('edition_id', teamData.edition_id)
            .order('score', { ascending: false });

          if (allEditionTeams) {
            const index = allEditionTeams.findIndex((t) => t.id === teamId);
            setRank(index >= 0 ? index + 1 : null);
          }
        }

        // 4. Fetch certificates issued to this team
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

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[var(--accent-red)] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={team?.edition?.id ? `/editions/${team.edition.id}` : '/hall-of-fame'}
            className="flex items-center gap-2 text-sm text-[#71717a] hover:text-[var(--accent-red)] transition-colors"
          >
            <ChevronLeft size={16} /> Back to Edition
          </Link>

          <span className="text-xs font-mono text-[var(--accent-red)] uppercase tracking-wider font-semibold">
            OFFICIAL TEAM RECORD
          </span>
        </div>

        {/* Team Profile Header Banner */}
        <div className="bg-[#131316] border-l-4 border-l-[var(--accent-red)] border-y border-r border-[#26262b] rounded-2xl p-6 sm:p-10 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--accent-red)] uppercase tracking-widest block font-bold">
                {team?.edition?.name || 'GenCode League'}
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white mt-1">
                {team?.name || 'Team Profile'}
              </h1>
            </div>

            {rank !== null && (
              <div
                className={`px-5 py-3 rounded-2xl border text-center ${
                  rank === 1
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/40 shadow-[0_0_16px_rgba(212,175,55,0.15)]'
                    : 'bg-[#18181c] border-[#26262b]'
                }`}
              >
                <span
                  className={`text-[10px] font-mono uppercase font-bold block ${
                    rank === 1 ? 'text-[#d4af37]' : 'text-[#71717a]'
                  }`}
                >
                  Final Standing
                </span>
                <span className="text-2xl font-black text-white font-mono">
                  #{rank} Place
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024]">
              Score: <strong className="text-[#d4af37] font-bold">★ {team?.score || 0} pts</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024]">
              Budget: <strong className="text-emerald-400 font-bold">{formatCurrency(team?.budget || 0)}</strong>
            </div>
            {team?.linkedTeam && (
              <div className="px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024] text-[#a1a1aa]">
                Linked Prior Franchise: <strong className="text-white">{team.linkedTeam.name}</strong>
              </div>
            )}
          </div>
        </div>

        {/* TEAM MEMBERS ROSTER */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Users size={20} className="text-[var(--accent-red)]" />
            Registered Team Members & Captain
          </h2>

          {members.length === 0 ? (
            <p className="text-xs text-[#71717a] italic py-4">
              Individual members have not been enumerated for this team record.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {member.name || member.full_name}
                    </span>
                    {member.is_captain && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30">
                        CAPTAIN
                      </span>
                    )}
                  </div>
                  {member.college && (
                    <div className="text-[11px] text-[#a1a1aa] truncate">
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

        {/* ISSUED CERTIFICATES */}
        <section className="bg-[#131316] border border-[#26262b] rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202024]">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Award size={20} className="text-[#d4af37]" />
              Certificates Issued to Team & Members
            </h2>
            <span className="text-xs font-mono text-[#71717a]">
              {certificates.length} Certificate(s)
            </span>
          </div>

          {certificates.length === 0 ? (
            <p className="text-xs text-[#71717a] italic py-6 text-center">
              No certificates have been issued to this team yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#d4af37] block">
                      {cert.certificate_id}
                    </span>
                    <h4 className="font-bold text-white text-base">
                      {cert.recipient_name}
                    </h4>
                    <span className="text-xs text-[var(--accent-red)] capitalize font-medium">
                      {cert.certificate_type.replace('_', ' ')}
                    </span>
                  </div>

                  <Link
                    to={`/verify/${cert.certificate_id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#202025] text-xs font-semibold text-[#e1e1e6] flex items-center gap-1.5 transition-colors border border-[#26262b] shrink-0"
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
