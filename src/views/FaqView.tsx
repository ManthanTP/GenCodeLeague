import React, { useEffect, useState, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  FileQuestion,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { DEFAULT_FAQS } from '../data/faqData';
import type { FaqEntry } from '../types/database';
import './FaqView.css';

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

  const topicCounts = useMemo(() => {
    return {
      all: faqs.length,
      auction: faqs.filter(f =>
        f.question.toLowerCase().includes('auction') ||
        f.question.toLowerCase().includes('bid') ||
        f.question.toLowerCase().includes('timer') ||
        f.question.toLowerCase().includes('round')
      ).length,
      budget: faqs.filter(f =>
        f.question.toLowerCase().includes('budget') ||
        f.question.toLowerCase().includes('leaderboard') ||
        f.question.toLowerCase().includes('podium') ||
        f.question.toLowerCase().includes('tie')
      ).length,
      certs: faqs.filter(f =>
        f.question.toLowerCase().includes('certificate') ||
        f.question.toLowerCase().includes('verify')
      ).length,
      teams: faqs.filter(f =>
        f.question.toLowerCase().includes('team') ||
        f.question.toLowerCase().includes('roster') ||
        f.question.toLowerCase().includes('announcement') ||
        f.question.toLowerCase().includes('champion')
      ).length,
    };
  }, [faqs]);

  return (
    <div
      className="gcl-live-page min-h-screen text-[#f4f4f6] selection:bg-[#ff2a38] selection:text-white pb-20"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="page-shell">
        {/* HERO CARD: full width of content column (max-width 1120px), 34px vertical padding, subtle diagonal red sheen. Search field inside */}
        <div className="gcl-card gcl-card--hero mb-[22px]">
          <div className="flex flex-col items-center">
            <div className="gcl-hero-pill">
              <span className="gcl-hero-dot" />
              <span>OFFICIAL LEAGUE KNOWLEDGE BASE</span>
            </div>
            <h1 className="gcl-hero-title">
              Frequently Asked Questions
            </h1>
            <p className="gcl-hero-desc mb-6">
              Authoritative documentation for technical auction bidding mechanics, budget equations, cryptographic certificate verification, and podium protocols.
            </p>

            {/* SEARCH FIELD: inside the hero, below description */}
            <div className="gcl-search-wrapper !mb-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by keywords (e.g. budget, certificate, tie breaker)..."
                className="gcl-search-input"
                aria-label="Search frequently asked questions"
              />
              <Search size={18} className="gcl-search-icon" />
            </div>
          </div>
        </div>

        {/* BODY LAYOUT: 2 columns on desktop (above 900px), 1 column on mobile */}
        <div className="faq-layout-grid">
          {/* SIDEBAR: desktop topic filters as full-width stacked buttons with label left, count right */}
          <aside className="faq-sidebar gcl-card !p-3">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`faq-sidebar-btn ${activeCategory === 'all' ? 'active' : ''}`}
            >
              <span>All Topics</span>
              <span className="faq-topic-count">{topicCounts.all}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('auction')}
              className={`faq-sidebar-btn ${activeCategory === 'auction' ? 'active' : ''}`}
            >
              <span>Bidding & Rounds</span>
              <span className="faq-topic-count">{topicCounts.auction}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('budget')}
              className={`faq-sidebar-btn ${activeCategory === 'budget' ? 'active' : ''}`}
            >
              <span>Budgets & Mechanics</span>
              <span className="faq-topic-count">{topicCounts.budget}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('certs')}
              className={`faq-sidebar-btn ${activeCategory === 'certs' ? 'active' : ''}`}
            >
              <span>Certificates & Verification</span>
              <span className="faq-topic-count">{topicCounts.certs}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('teams')}
              className={`faq-sidebar-btn ${activeCategory === 'teams' ? 'active' : ''}`}
            >
              <span>Teams & Roster</span>
              <span className="faq-topic-count">{topicCounts.teams}</span>
            </button>
          </aside>

          {/* QUESTIONS COLUMN (with mobile horizontally scrolling chips row under 900px) */}
          <div className="min-w-0">
            {/* Mobile & Tablet Topic Chips */}
            <div className="faq-mobile-chips-row">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`faq-mobile-chip ${activeCategory === 'all' ? 'active' : ''}`}
              >
                <span>All Topics</span>
                <span className="opacity-70 text-[11px]">({topicCounts.all})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('auction')}
                className={`faq-mobile-chip ${activeCategory === 'auction' ? 'active' : ''}`}
              >
                <span>Bidding & Rounds</span>
                <span className="opacity-70 text-[11px]">({topicCounts.auction})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('budget')}
                className={`faq-mobile-chip ${activeCategory === 'budget' ? 'active' : ''}`}
              >
                <span>Budgets & Mechanics</span>
                <span className="opacity-70 text-[11px]">({topicCounts.budget})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('certs')}
                className={`faq-mobile-chip ${activeCategory === 'certs' ? 'active' : ''}`}
              >
                <span>Certificates & Verification</span>
                <span className="opacity-70 text-[11px]">({topicCounts.certs})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('teams')}
                className={`faq-mobile-chip ${activeCategory === 'teams' ? 'active' : ''}`}
              >
                <span>Teams & Roster</span>
                <span className="opacity-70 text-[11px]">({topicCounts.teams})</span>
              </button>
            </div>

            {/* Questions Accordion List */}
            {filteredFaqs.length === 0 ? (
              <div className="gcl-card text-center py-12 px-6">
                <FileQuestion size={44} className="text-[#52525b] mx-auto mb-3" />
                <h3 className="faq-empty-title">No Matching Answers</h3>
                <p className="faq-empty-desc">
                  We couldn't find questions matching "{search}". Try searching for keywords like "budget", "certificate", "timer", or "auction".
                </p>
              </div>
            ) : (
              <div className="faq-accordion-list">
                {filteredFaqs.map((faq, index) => {
                  const isOpen = openIds.has(faq.id);
                  return (
                    <div
                      key={faq.id}
                      className={`gcl-card gcl-card--interactive faq-card ${isOpen ? 'expanded' : ''} !p-0`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        className="faq-header-btn"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${faq.id}`}
                      >
                        <div className="faq-num-chip">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <h3 className="faq-question-text">
                          {faq.question}
                        </h3>
                        <div className="faq-chevron-btn" aria-hidden="true">
                          <ChevronDown size={18} />
                        </div>
                      </button>

                      <div
                        id={`faq-answer-${faq.id}`}
                        className={`faq-answer-grid ${isOpen ? 'expanded' : ''}`}
                      >
                        <div className="faq-answer-inner">
                          <p className="faq-answer-body">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
