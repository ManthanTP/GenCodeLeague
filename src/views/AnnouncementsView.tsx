import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Pin,
  Calendar,
  Search,
  Radio,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { useAuth } from '../hooks/useAuth';
import type { Announcement } from '../types/database';
import './AnnouncementsView.css';

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

  const pinnedCount = useMemo(() => {
    return announcements.filter((a) => a.is_pinned).length;
  }, [announcements]);

  return (
    <div
      className="gcl-live-page min-h-screen text-[#f4f4f6] selection:bg-[var(--accent-red)] selection:text-white pb-20"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="page-shell">
        {/* Admin Quick Jump Link if logged in */}
        {isAdmin && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => navigate('/123456789/GCL-0321/admin?tab=updates')}
              className="px-4 py-2 rounded-xl bg-[#18181c] hover:bg-[#222228] text-white border border-[#2e2e36] hover:border-[var(--accent-red)] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm font-mono h-[40px]"
            >
              <Radio size={14} className="text-[var(--accent-red)] animate-pulse" />
              <span>Admin Broadcast Console →</span>
            </button>
          </div>
        )}

        {/* HERO CARD: full width of content column (max-width 1120px), 34px vertical padding, subtle diagonal red sheen */}
        <div className="gcl-card gcl-card--hero mb-[22px]">
          <div className="gcl-hero-pill">
            <span className="gcl-hero-dot" />
            <span>OFFICIAL LEAGUE BROADCASTS</span>
          </div>
          <h1 className="gcl-hero-title">
            Announcements & Bulletins
          </h1>
          <p className="gcl-hero-desc">
            Real-time stage updates, schedule releases, tournament guidelines, and administrative bulletins.
          </p>
        </div>

        {/* SEARCH FIELD: one wide rounded field (max-width 640px, 50px tall, 14px radius, dark fill, 1px border), centered */}
        <div className="gcl-search-wrapper">
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gcl-search-input"
            aria-label="Search announcements"
          />
          <Search size={18} className="gcl-search-icon" />
        </div>

        {/* CHIPS: pill-shaped (7px 16px padding), dark fill with subtle border, active red */}
        <div className="gcl-chips-row">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`gcl-chip-btn ${filterType === 'all' ? 'active' : ''}`}
          >
            <span>All Bulletins</span>
            <span className="gcl-chip-count">({announcements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pinned')}
            className={`gcl-chip-btn ${filterType === 'pinned' ? 'active' : ''}`}
          >
            <span>Pinned Only</span>
            <span className="gcl-chip-count">({pinnedCount})</span>
          </button>
        </div>

        {/* List of Announcements */}
        {filtered.length === 0 ? (
          <div className="gcl-card text-center p-12 mb-[16px]">
            <Bell size={48} className="text-[#52525b] mx-auto mb-3" />
            <h3 className="gcl-card-title mb-2">No Announcements Found</h3>
            <p className="text-xs text-[#8e8e9a] max-w-sm mx-auto font-sans leading-relaxed">
              No bulletins match "{search}". Check back soon for official updates.
            </p>
          </div>
        ) : (
          <div className="bulletins-list">
            {filtered.map((ann) => (
              <div
                key={ann.id}
                className={`gcl-card gcl-card--interactive ${ann.is_pinned ? 'gcl-card--accent' : ''}`}
              >
                {/* Top row: tag on the left, date on the right in monospace style with calendar icon */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    {ann.is_pinned ? (
                      <span className="tag-pinned">
                        <Pin size={11} className="rotate-45" /> PINNED BULLETIN
                      </span>
                    ) : (
                      <span className="tag-neutral">
                        OFFICIAL BULLETIN
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-[#8e8e9a] flex items-center gap-1.5">
                    <Calendar size={13} />
                    {new Date(ann.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title in site's heading font, about 24px, bold, white */}
                <h3 className="bulletin-title">
                  {ann.title}
                </h3>

                {/* Body text in soft light grey (#c9c9d1), line-height 1.55, max ~80ch */}
                <p className="bulletin-body">
                  {ann.body}
                </p>

                {/* Footer row: thin dark divider above it, Issued by on left, Verified Dispatch on right in success green */}
                <div className="bulletin-footer">
                  <span className="bulletin-issuer">
                    Issued by: <strong className="bulletin-issuer-name">{ann.created_by || 'League Arbiter'}</strong>
                  </span>
                  <span className="bulletin-verified">
                    <span className="bulletin-verified-dot" /> Verified Dispatch
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
