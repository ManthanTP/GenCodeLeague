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
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Cyber Hero Banner with Red Opposite Corner Glow (.panel.red) */}
        <div className="panel red relative overflow-hidden rounded-2xl p-6 sm:p-10 flex flex-col items-center text-center">
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[rgba(232,33,46,0.15)] border border-[#ff4d5a]/40 text-[#ff4d5a] text-xs font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(232,33,46,0.25)] uppercase">
              <HelpCircle size={15} /> OFFICIAL LEAGUE KNOWLEDGE BASE
            </div>
            <h1
              className="text-4xl sm:text-6xl font-black text-white tracking-wide uppercase"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              Frequently Asked Questions
            </h1>
            <div className="w-16 h-1 bg-[#e8212e] mx-auto rounded-full" />
            <p className="text-sm text-[#9a9aa3] font-medium font-sans max-w-xl mx-auto leading-relaxed">
              Authoritative documentation for technical auction bidding mechanics, budget equations, cryptographic certificate verification, and podium protocols.
            </p>
          </div>
        </div>

        {/* Search & Category Navigation Pills */}
        <div className="space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a9aa3]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keywords (e.g. budget, certificate, tie breaker)..."
              className="gcl-input w-full pl-11 py-3 text-sm font-mono"
              style={{
                borderRadius: '10px',
                background: '#18181c',
                border: '1px solid #3e3e48',
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-bold ${activeCategory === 'all' ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}`}
            >
              All Topics ({faqs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('auction')}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-bold ${activeCategory === 'auction' ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}`}
            >
              Bidding & Rounds
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('budget')}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-bold ${activeCategory === 'budget' ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}`}
            >
              Budgets & Mechanics
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('certs')}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-bold ${activeCategory === 'certs' ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}`}
            >
              Certificates & Verification
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('teams')}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-bold ${activeCategory === 'teams' ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}`}
            >
              Teams & Roster
            </button>
          </div>
        </div>

        {/* FAQ Accordion List with Opposite Corner Glow on Open Panels */}
        {filteredFaqs.length === 0 ? (
          <div className="py-16 text-center panel red p-8 shadow-xl">
            <FileQuestion size={44} className="text-[#52525b] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">No Matching Answers</h3>
            <p className="text-xs text-[#9a9aa3] mt-1 max-w-md mx-auto">
              We couldn't find questions matching "{search}". Try searching for keywords like "budget", "certificate", "timer", or "auction".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIds.has(faq.id);
              return (
                <div
                  key={faq.id}
                  className={`transition-all duration-200 overflow-hidden ${
                    isOpen ? 'panel red' : 'panel'
                  }`}
                  style={{
                    borderRadius: '14px',
                    padding: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-white hover:text-[#ff4d5a] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className="num"
                        style={{
                          fontSize: '13px',
                          color: '#ff4d5a',
                          padding: '2px 8px',
                          flexShrink: 0,
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="text-lg sm:text-xl tracking-wide uppercase font-extrabold truncate"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }}
                      >
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-[#9a9aa3] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#ff4d5a]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-[#e1e1e6] leading-relaxed border-t border-[#35353b] font-sans">
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
