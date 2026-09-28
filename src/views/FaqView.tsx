import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  ChevronLeft,
  ChevronDown,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import type { FaqEntry } from '../types/database';

export default function FaqView() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    async function loadFaqs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('faq_entries')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data) {
          setFaqs(data);
          // Open first 2 by default
          if (data.length > 0) {
            setOpenIds(new Set([data[0].id, data[1]?.id].filter(Boolean)));
          }
        }
      } finally {
        setLoading(false);
      }
    }

    loadFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/hall-of-fame"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Hall of Fame
          </Link>

          <span className="text-xs font-mono text-cyan-400">
            KNOWLEDGE BASE
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wider">
            <HelpCircle size={14} /> FREQUENTLY ASKED QUESTIONS
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Everything You Need To Know
          </h1>
          <p className="text-sm text-slate-400">
            Official explanations for certificates, live tech auction bidding mechanics, registration policies, and ranking systems.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xl mx-auto">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or keywords..."
            className="gcl-input w-full pl-11 py-3 text-sm"
          />
        </div>

        {/* FAQ Accordion List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono">Loading FAQ entries...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 backdrop-blur-md">
            <HelpCircle size={44} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Matching Answers</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              We couldn't find any questions matching your query. Try searching for "certificate", "auction", or "registration".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq) => {
              const isOpen = openIds.has(faq.id);
              return (
                <div
                  key={faq.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl overflow-hidden backdrop-blur-md transition-all shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-white hover:text-cyan-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
