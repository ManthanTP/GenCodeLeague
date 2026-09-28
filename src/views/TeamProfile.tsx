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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={team?.edition?.id ? `/editions/${team.edition.id}` : '/hall-of-fame'}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Edition
          </Link>

          <span className="text-xs font-mono text-cyan-400">
            OFFICIAL TEAM RECORD
          </span>
        </div>

        {/* Team Profile Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                {team?.edition?.name || 'GenCode League'}
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white mt-1">
                {team?.name || 'Team Profile'}
              </h1>
            </div>

            {rank !== null && (
              <div className="px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                <span className="text-[10px] font-mono text-yellow-400 uppercase font-bold block">
                  Final Standing
                </span>
                <span className="text-2xl font-black text-white font-mono">
                  #{rank} Place
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              Score: <strong className="text-yellow-400 font-bold">★ {team?.score || 0} pts</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              Budget: <strong className="text-green-400 font-bold">{formatCurrency(team?.budget || 0)}</strong>
            </div>
            {team?.linkedTeam && (
              <div className="px-3 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-300">
                Linked Prior Franchise: <strong className="text-white">{team.linkedTeam.name}</strong>
              </div>
            )}
          </div>
        </div>

        {/* TEAM MEMBERS ROSTER */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Users size={20} className="text-cyan-400" />
            Registered Team Members & Captain
          </h2>

          {members.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">
              Individual members have not been enumerated for this team record.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {member.name || member.full_name}
                    </span>
                    {member.is_captain && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        CAPTAIN
                      </span>
                    )}
                  </div>
                  {member.college && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {member.college}
                    </div>
                  )}
                  {member.department && (
                    <div className="text-[10px] font-mono text-slate-500">
                      Dept: {member.department}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ISSUED CERTIFICATES */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Award size={20} className="text-yellow-400" />
              Certificates Issued to Team & Members
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {certificates.length} Certificate(s)
            </span>
          </div>

          {certificates.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">
              No certificates have been issued to this team yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 block">
                      {cert.certificate_id}
                    </span>
                    <h4 className="font-bold text-white text-base">
                      {cert.recipient_name}
                    </h4>
                    <span className="text-xs text-cyan-400 capitalize font-medium">
                      {cert.certificate_type.replace('_', ' ')}
                    </span>
                  </div>

                  <Link
                    to={`/verify/${cert.certificate_id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0"
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
