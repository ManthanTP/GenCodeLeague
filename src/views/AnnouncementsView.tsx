import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Pin,
  Calendar,
  Sparkles,
  Search,
  ShieldAlert,
  ArrowRight,
  Radio,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { useAuth } from '../hooks/useAuth';
import type { Announcement } from '../types/database';

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Welcome to Gen Code League: Arena Bidding Rules & Protocol',
    body: 'All participating teams and viewers: The arena is officially prepped for live competition. Ensure all team captains are positioned at their assigned console terminals. Minimum bid increments are set at ₹10,00,000. Question timers run in real-time.',
    is_pinned: true,
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    created_by: 'GCL Official Desk',
  },
  {
    id: 'ann-2',
    title: 'Cryptographic Certificate Verification Gateway Live',
    body: 'Participants, coordinators, and winners can now retrieve and cryptographically verify all issued credentials using the official verification portal at /my-certificates or by scanning the tamper-proof QR code.',
    is_pinned: true,
    published_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    created_by: 'Accreditation Bureau',
  },
  {
    id: 'ann-3',
    title: 'Round 2 Carryover Budget Calculation Formula Announced',
    body: 'As a reminder, all unspent budget from Round 1 will be calculated toward your Round 2 baseline surplus according to official league mechanics. Strategize your spend wisely!',
    is_pinned: false,
    published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    created_by: 'League Arbiter',
  },
];

export default function AnnouncementsView() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'recent'>('all');
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAnnouncements(data);
      } else {
        setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      }
    } catch {
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filtered = useMemo(() => {
    let list = announcements;
    if (filterType === 'pinned') {
      list = list.filter((a) => a.is_pinned);
    } else if (filterType === 'recent') {
      list = list.slice(0, 5);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    );
  }, [announcements, search, filterType]);

  return (
    <div
      className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[var(--accent-red)] selection:text-white pb-20"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Admin Quick Jump Link if logged in */}
        {isAdmin && (
          <div className="flex justify-end">
            <button
              onClick={() => navigate('/123456789/GCL-0321/admin?tab=updates')}
              className="px-4 py-2 rounded-xl bg-[#18181c] hover:bg-[#222228] text-white border border-[#2e2e36] hover:border-[var(--accent-red)] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm font-mono"
            >
              <Radio size={14} className="text-[var(--accent-red)] animate-pulse" />
              <span>Admin Broadcast Console →</span>
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="gcl-card-crimson p-6 sm:p-8 text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 text-[var(--accent-red)] text-xs font-mono font-bold tracking-wider shadow-[0_0_15px_rgba(232,33,46,0.2)]">
            <Radio size={14} className="animate-pulse" /> OFFICIAL LEAGUE BROADCASTS
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-wide uppercase font-['Rajdhani',sans-serif]">
            Announcements & Bulletins
          </h1>
          <p className="text-sm text-[#a1a1aa] font-medium font-sans">
            Real-time stage updates, schedule releases, tournament guidelines, and administrative bulletins.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="gcl-input w-full pl-9 py-2 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              All Bulletins ({announcements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pinned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                filterType === 'pinned'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              Pinned Only
            </button>
          </div>
        </div>

        {/* List of Announcements */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-[#131316] rounded-2xl border border-[#26262b] p-8 shadow-xl">
            <Bell size={48} className="text-[#52525b] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Announcements Found</h3>
            <p className="text-xs text-[#a1a1aa] mt-1 max-w-md mx-auto">
              No bulletins match "{search}". Check back soon for official updates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ann) => (
              <div
                key={ann.id}
                className={`p-6 rounded-2xl border backdrop-blur-md transition-all shadow-xl space-y-3 ${
                  ann.is_pinned
                    ? 'bg-[#16161b] border-[var(--accent-red)]/60 shadow-[0_0_24px_rgba(232,33,46,0.18)]'
                    : 'bg-[#131316] border-[#26262b] hover:border-[#383842]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    {ann.is_pinned && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--accent-red)] text-white shadow-sm uppercase tracking-wider">
                        <Pin size={11} className="rotate-45" /> PINNED BULLETIN
                      </span>
                    )}
                    <h3 className="text-xl font-extrabold text-white font-['Rajdhani',sans-serif] uppercase tracking-wide">
                      {ann.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-[#71717a] flex items-center gap-1.5">
                      <Calendar size={13} />
                      {new Date(ann.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-[#d4d4d8] whitespace-pre-line leading-relaxed font-sans border-t border-[#202026] pt-3">
                  {ann.body}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#71717a]">
                  <span className="flex items-center gap-1">
                    <Info size={12} className="text-[var(--accent-red)]" />
                    Issued by: <strong className="text-white">{ann.created_by || 'League Arbiter'}</strong>
                  </span>
                  <span className="text-emerald-400">● Verified Dispatch</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
