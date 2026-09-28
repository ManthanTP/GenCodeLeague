import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Pin,
  ChevronLeft,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { logAdminAction } from '../utils/certificateUtils';
import type { Announcement } from '../types/database';

export default function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Admin state
  const isMasterAuthed =
    sessionStorage.getItem('gcl_admin_authenticated') === 'true';

  // New announcement modal
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (!error && data) {
        setAnnouncements(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        body: body.trim(),
        is_pinned: isPinned,
        created_by: 'admin',
      });

      if (error) throw error;

      await logAdminAction('ANNOUNCEMENT_PUBLISHED', { title });

      showToast('Announcement published successfully!', 'success');
      setTitle('');
      setBody('');
      setIsPinned(false);
      setIsCreating(false);
      loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    if (!window.confirm(`Delete announcement "${annTitle}"?`)) return;

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;

      showToast('Announcement deleted', 'success');
      loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete announcement', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/hall-of-fame"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Hall of Fame
          </Link>

          {isMasterAuthed && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <Plus size={15} /> Post Announcement
            </button>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wider">
            <Bell size={14} /> OFFICIAL DISPATCHES
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Announcements & Bulletins
          </h1>
          <p className="text-sm text-slate-400">
            Real-time updates, schedule releases, tournament guidelines, and administrative bulletins.
          </p>
        </div>

        {/* List of Announcements */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono">Loading bulletins...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 backdrop-blur-md">
            <Bell size={48} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Announcements Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Check back soon for official updates regarding upcoming rounds and bracket schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`p-6 rounded-2xl border backdrop-blur-md transition-all shadow-xl space-y-3 ${
                  ann.is_pinned
                    ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-cyan-500/50 shadow-[0_0_25px_rgba(0,240,255,0.1)]'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    {ann.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                        <Pin size={10} className="rotate-45" /> PINNED BULLETIN
                      </span>
                    )}
                    <h3 className="text-xl font-extrabold text-white">
                      {ann.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(ann.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    {isMasterAuthed && (
                      <button
                        onClick={() => handleDelete(ann.id, ann.title)}
                        className="p-1.5 rounded-lg hover:bg-red-950/50 text-red-400 transition-colors"
                        title="Delete Announcement"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {ann.body}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE ANNOUNCEMENT MODAL */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-xl font-bold text-white">Post New Announcement</h3>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Round 2 Schedule Update"
                    className="gcl-input w-full text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
                    Announcement Body *
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Provide full bulletin text..."
                    className="gcl-input w-full h-32 text-xs resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pin-check"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <label htmlFor="pin-check" className="text-xs text-slate-300 select-none">
                    Pin this bulletin to the top of the feed
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs disabled:opacity-50"
                  >
                    {submitting ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
