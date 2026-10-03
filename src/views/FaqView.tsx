import React, { useEffect, useState, useMemo } from 'react';
import {
  HelpCircle,
  ChevronDown,
  Search,
  Award,
  Zap,
  ShieldCheck,
  Users,
  Coins,
  FileQuestion,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { DEFAULT_FAQS } from '../data/faqData';
import type { FaqEntry } from '../types/database';

export default function FaqView() {
  const [faqs, setFaqs] = useState<FaqEntry[]>(DEFAULT_FAQS);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['faq-1', 'faq-2']));
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'auction' | 'budget' | 'certs' | 'teams'>('all');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data, error } = await supabase
          .from('faq_entries')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          setFaqs(data);
          setOpenIds(new Set([data[0].id, data[1]?.id].filter(Boolean)));
        } else {
          // Guaranteed fallback so FAQ is always complete and consistent across GCL
          setFaqs(DEFAULT_FAQS);
          setOpenIds(new Set(['faq-1', 'faq-2']));
        }
      } catch (err) {
        setFaqs(DEFAULT_FAQS);
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
    let list = faqs;

    if (activeCategory === 'auction') {
      list = list.filter((f) =>
        f.question.toLowerCase().includes('auction') ||
        f.question.toLowerCase().includes('bid') ||
        f.question.toLowerCase().includes('timer') ||
        f.question.toLowerCase().includes('round')
      );
    } else if (activeCategory === 'budget') {
      list = list.filter((f) =>
        f.question.toLowerCase().includes('budget') ||
        f.question.toLowerCase().includes('leaderboard') ||
        f.question.toLowerCase().includes('podium') ||
        f.question.toLowerCase().includes('tie')
      );
    } else if (activeCategory === 'certs') {
      list = list.filter((f) =>
        f.question.toLowerCase().includes('certificate') ||
        f.question.toLowerCase().includes('verify')
      );
    } else if (activeCategory === 'teams') {
      list = list.filter((f) =>
        f.question.toLowerCase().includes('team') ||
        f.question.toLowerCase().includes('roster') ||
        f.question.toLowerCase().includes('announcement') ||
        f.question.toLowerCase().includes('champion')
      );
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [faqs, search, activeCategory]);

  return (
    <div
      className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[var(--accent-red)] selection:text-white pb-20"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 text-[var(--accent-red)] text-xs font-mono font-bold tracking-wider shadow-[0_0_15px_rgba(232,33,46,0.2)]">
            <HelpCircle size={15} /> OFFICIAL LEAGUE KNOWLEDGE BASE
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-wide uppercase font-['Rajdhani',sans-serif]">
            FREQUENTLY ASKED QUESTIONS
          </h1>
          <p className="text-sm text-[#a1a1aa] font-medium font-sans">
            Authoritative documentation for technical auction bidding mechanics, budget equations, cryptographic certificate verification, and podium protocols.
          </p>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717a]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keywords (e.g. budget, certificate, tie breaker)..."
              className="gcl-input w-full pl-11 py-3 text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              All Topics ({faqs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('auction')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeCategory === 'auction'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              Bidding & Rounds
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('budget')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeCategory === 'budget'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              Budgets & Scoring
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('certs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeCategory === 'certs'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              Certificates & Verification
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('teams')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeCategory === 'teams'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                  : 'bg-[#18181c] text-[#a1a1aa] hover:text-white border border-[#26262b]'
              }`}
            >
              Teams & Roster
            </button>
          </div>
        </div>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          <div className="py-16 text-center bg-[#131316] rounded-2xl border border-[#26262b] p-8 shadow-xl">
            <FileQuestion size={44} className="text-[#52525b] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Matching Answers</h3>
            <p className="text-xs text-[#a1a1aa] mt-1 max-w-md mx-auto">
              We couldn't find questions matching "{search}". Try searching for keywords like "budget", "certificate", "timer", or "auction".
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIds.has(faq.id);
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                    isOpen
                      ? 'bg-[#15151a] border-[var(--accent-red)]/50 shadow-[0_0_20px_rgba(232,33,46,0.12)]'
                      : 'bg-[#131316] border-[#26262b] hover:border-[#383842]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-white hover:text-[var(--accent-red)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-[var(--accent-red)] shrink-0 font-bold">
                        {String(index + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-['Rajdhani',sans-serif] text-lg tracking-wide uppercase font-extrabold truncate">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-[#71717a] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--accent-red)]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-[#d4d4d8] leading-relaxed border-t border-[#222228] font-sans">
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
