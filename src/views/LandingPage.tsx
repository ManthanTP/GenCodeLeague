import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Trophy,
  User,
  Radio,
  Image as ImageIcon,
  Award,
} from 'lucide-react';
import Header from '../components/Header';
import { HeroCarousel, type HeroCarouselItem } from '../components/ui/hero-carousel';
import { ShimmerText } from '../components/ui/shimmer-text';
import { getLandingContent, type LandingContent } from '../services/contentService';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTimer } from '../hooks/useTimer';
import { formatCurrency } from '../utils/formatters';
import { getRoundBasePrice } from '../data/roundsData';
import './LandingPage.css';

// Fallback high-res technical arena hero photo if none configured yet
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2400&q=80';

// Animated Counter component with scroll-trigger and reduced motion support
function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  fallback = '—',
}: {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  fallback?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const reducedMotion = useReducedMotion();
  const [displayVal, setDisplayVal] = useState<number | null>(reducedMotion && typeof value === 'number' ? value : 0);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayVal(null);
      return;
    }
    if (reducedMotion) {
      setDisplayVal(value);
      return;
    }
    if (!isInView) return;

    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (value - start) * eased);
      setDisplayVal(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayVal(value);
      }
    };

    const handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, [isInView, value, reducedMotion]);

  if (value === null || value === undefined || isNaN(value) || displayVal === null) {
    return <span ref={ref}>{fallback}</span>;
  }

  return (
    <span ref={ref}>
      {prefix}
      {displayVal.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  // 1. Fetch Admin Landing Content
  const [content, setContent] = useState<LandingContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  // 2. Fetch Live Event State & Teams
  const { eventState, edition, loading: liveLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const { formatted } = useTimer(eventState);

  useEffect(() => {
    // SEO setup
    document.title = 'Gen Code League | Technical Auction Event';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Gen Code League is the premier competitive coding auction where code meets strategy and intellect meets the hammer.'
      );
    }

    async function loadContent() {
      try {
        const data = await getLandingContent();
        setContent(data);
      } catch (err) {
        console.warn('Failed to load landing content:', err);
      } finally {
        setContentLoading(false);
      }
    }
    loadContent();
  }, []);

  // Edition label
  const editionLabel = content?.settings?.edition_label || edition?.name || 'GCL 2025';

  // Hero image
  const heroImage = content?.settings?.hero_image_url || DEFAULT_HERO_IMAGE;

  // Format Carousel Items
  const carouselItems: HeroCarouselItem[] = useMemo(() => {
    if (!content?.featuredGallery || content.featuredGallery.length === 0) return [];
    return content.featuredGallery.map((g) => ({
      id: g.id,
      title: (g.title || 'Event Highlight').toUpperCase(),
      image: g.image_url,
      credit: g.credit || 'BY GCL MEDIA TEAM.',
      meta: Array.isArray(g.meta) && g.meta.length > 0 ? g.meta : [g.tag || 'GCL MOMENTS'],
      accent: g.accent || '#8a8a8a',
    }));
  }, [content?.featuredGallery]);

  // Determine current round base price
  const roundBasePrice = useMemo(() => {
    if (!eventState) return 0;
    return edition?.base_price || getRoundBasePrice(eventState.current_round_index || 0);
  }, [eventState, edition?.base_price]);

  // Current bid amount display
  const currentBidAmount = useMemo(() => {
    if (!eventState) return 0;
    if (eventState.current_bid_preview?.amount) {
      return eventState.current_bid_preview.amount;
    }
    return roundBasePrice;
  }, [eventState, roundBasePrice]);

  // Stats calculation
  const totalTeamsCount = teams && teams.length > 0 ? teams.length : null;
  const startingBudgetNum = edition?.starting_budget ? edition.starting_budget : null;
  const startingBudgetFormatted = startingBudgetNum ? formatCurrency(startingBudgetNum) : '—';
  const totalRoundsVal = edition?.total_rounds ?? 3;
  const qPerRoundVal = edition?.questions_per_round ?? 20;

  return (
    <div className="gcl-landing-root min-h-screen">
      {/* Universal Navigation Header */}
      <Header viewMode="live" onToggleView={() => {}} />

      <main>
        {/* ====================================================================
            A. HERO SECTION
            ==================================================================== */}
        <section className="landing-shell pt-10 sm:pt-16 pb-12 sm:pb-20">
          {/* Eyebrow */}
          <div className="mb-4">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-[#8e8e99]">
              Technical auction event / {editionLabel}
            </span>
          </div>

          {/* Huge Masked Condensed Headline */}
          <h1
            className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.03em] select-none mb-8 sm:mb-12"
            style={{
              fontSize: 'clamp(54px, 10.5vw, 170px)',
              lineHeight: 0.86,
            }}
          >
            <div className="overflow-hidden">
              <motion.div
                initial={reducedMotion ? { y: 0 } : { y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="text-[#f4f4f6]"
              >
                WHERE CODE
              </motion.div>
            </div>
            <div className="overflow-hidden">
              <motion.div
                initial={reducedMotion ? { y: 0 } : { y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-[#f4f4f6]"
              >
                MEETS THE <span className="text-[#ff2a3d]">HAMMER.</span>
              </motion.div>
            </div>
          </h1>

          {/* Wide Hero Photo Box with Overlaid Controls */}
          <div className="relative w-full overflow-hidden bg-[#131316] border border-[#26262b] group">
            {/* 21:9 Aspect Ratio Frame */}
            <div className="w-full relative" style={{ aspectRatio: '21 / 9', minHeight: '300px' }}>
              <img
                src={heroImage}
                alt={`${editionLabel} Event Arena`}
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none" />

              {/* Bottom Left Buttons on Hero Photo (Desktop & Tablet) */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-10 hidden sm:flex items-center gap-3">
                <Link
                  to="/live"
                  className="bg-[#ff2a3d] hover:bg-[#e02435] text-white font-mono font-semibold uppercase text-xs sm:text-sm px-6 py-3 tracking-wider transition-all inline-flex items-center gap-2"
                >
                  <Radio size={14} className="animate-pulse" />
                  Watch live
                </Link>
                <Link
                  to="/gallery"
                  className="border border-white/20 hover:border-white/60 bg-black/50 backdrop-blur-md text-white font-mono font-semibold uppercase text-xs sm:text-sm px-6 py-3 tracking-wider transition-all inline-flex items-center gap-2"
                >
                  <ImageIcon size={14} />
                  Gallery
                </Link>
              </div>

              {/* Bottom Right: Compact Translucent Live Card (Desktop Overlay >= 960px) */}
              <div className="hidden lg:block absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-10 max-w-sm w-full">
                <LiveStateCard
                  eventState={eventState}
                  editionLabel={editionLabel}
                  currentBidAmount={currentBidAmount}
                  timerFormatted={formatted}
                  liveLoading={liveLoading}
                />
              </div>
            </div>

            {/* Mobile Controls & Stacked Live Card under 960px */}
            <div className="lg:hidden p-4 sm:p-5 bg-[#131316] border-t border-[#26262b] space-y-4">
              <div className="flex sm:hidden items-center gap-3 w-full">
                <Link
                  to="/live"
                  className="flex-1 text-center bg-[#ff2a3d] hover:bg-[#e02435] text-white font-mono font-semibold uppercase text-xs px-4 py-3 tracking-wider inline-flex items-center justify-center gap-2"
                >
                  <Radio size={14} className="animate-pulse" />
                  Watch live
                </Link>
                <Link
                  to="/gallery"
                  className="flex-1 text-center border border-white/20 hover:border-white/60 bg-black/50 text-white font-mono font-semibold uppercase text-xs px-4 py-3 tracking-wider inline-flex items-center justify-center gap-2"
                >
                  <ImageIcon size={14} />
                  Gallery
                </Link>
              </div>

              <LiveStateCard
                eventState={eventState}
                editionLabel={editionLabel}
                currentBidAmount={currentBidAmount}
                timerFormatted={formatted}
                liveLoading={liveLoading}
              />
            </div>
          </div>
        </section>

        {/* ====================================================================
            B. STATS STRIP SECTION
            ==================================================================== */}
        <section className="w-full hairline-t hairline-b bg-[#0e0e11]">
          <div className="landing-shell">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#26262b]">
              {/* Stat 1: Teams */}
              <div className="py-8 sm:py-10 pr-4 sm:pr-8">
                <div className="font-['Barlow_Semi_Condensed',sans-serif] font-bold text-[#f4f4f6] text-[clamp(44px,5.4vw,84px)] leading-none mb-2">
                  <AnimatedNumber value={totalTeamsCount} fallback="—" />
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8e8e99]">
                  Teams
                </div>
              </div>

              {/* Stat 2: Budget Per Team */}
              <div className="py-8 sm:py-10 px-0 md:px-8">
                <div className="font-['Barlow_Semi_Condensed',sans-serif] font-bold text-[#f4f4f6] text-[clamp(44px,5.4vw,84px)] leading-none mb-2">
                  {startingBudgetFormatted}
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8e8e99]">
                  Budget per team
                </div>
              </div>

              {/* Stat 3: Rounds + Final */}
              <div className="py-8 sm:py-10 px-0 md:px-8">
                <div className="font-['Barlow_Semi_Condensed',sans-serif] font-bold text-[#f4f4f6] text-[clamp(44px,5.4vw,84px)] leading-none mb-2">
                  <AnimatedNumber value={totalRoundsVal} fallback="—" />
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8e8e99]">
                  Rounds + final
                </div>
              </div>

              {/* Stat 4: Questions Per Round */}
              <div className="py-8 sm:py-10 pl-0 md:pl-8">
                <div className="font-['Barlow_Semi_Condensed',sans-serif] font-bold text-[#f4f4f6] text-[clamp(44px,5.4vw,84px)] leading-none mb-2">
                  <AnimatedNumber value={qPerRoundVal} fallback="—" />
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8e8e99]">
                  Questions per round
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            C. THE FORMAT SECTION
            ==================================================================== */}
        <section className="landing-shell py-16 sm:py-28">
          <div className="mb-3">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em]">
              <span className="text-[#ff2a3d] font-bold">01</span> / The format
            </span>
          </div>

          <h2
            className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(36px,6vw,72px)] leading-[0.92] mb-12 sm:mb-16"
          >
            Four moves. <span className="text-[#ff2a3d]">One champion.</span>
          </h2>

          <div className="hairline-t">
            {/* Format Row 1 */}
            <div className="format-row hairline-b py-6 sm:py-8 group cursor-default">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#8e8e99] group-hover:text-[#ff2a3d] transition-colors">
                    01
                  </span>
                  <span className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl sm:text-4xl text-[#f4f4f6] tracking-tight">
                    Bid live
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs sm:text-sm text-[#8e8e99]">
                    A question goes on the block.
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-[#8e8e99] group-hover:text-[#ff2a3d] transition-transform group-hover:translate-x-2 hidden sm:block"
                  />
                </div>
              </div>
            </div>

            {/* Format Row 2 */}
            <div className="format-row hairline-b py-6 sm:py-8 group cursor-default">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#8e8e99] group-hover:text-[#ff2a3d] transition-colors">
                    02
                  </span>
                  <span className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl sm:text-4xl text-[#f4f4f6] tracking-tight">
                    Win the question
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs sm:text-sm text-[#8e8e99]">
                    Highest bid answers it.
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-[#8e8e99] group-hover:text-[#ff2a3d] transition-transform group-hover:translate-x-2 hidden sm:block"
                  />
                </div>
              </div>
            </div>

            {/* Format Row 3 */}
            <div className="format-row hairline-b py-6 sm:py-8 group cursor-default">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#8e8e99] group-hover:text-[#ff2a3d] transition-colors">
                    03
                  </span>
                  <span className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl sm:text-4xl text-[#f4f4f6] tracking-tight">
                    Spend with strategy
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs sm:text-sm text-[#8e8e99]">
                    Every crore is a choice.
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-[#8e8e99] group-hover:text-[#ff2a3d] transition-transform group-hover:translate-x-2 hidden sm:block"
                  />
                </div>
              </div>
            </div>

            {/* Format Row 4 */}
            <div className="format-row hairline-b py-6 sm:py-8 group cursor-default">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#8e8e99] group-hover:text-[#ff2a3d] transition-colors">
                    04
                  </span>
                  <span className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl sm:text-4xl text-[#f4f4f6] tracking-tight">
                    Reach the podium
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs sm:text-sm text-[#8e8e99]">
                    Revealed from the bottom up.
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-[#8e8e99] group-hover:text-[#ff2a3d] transition-transform group-hover:translate-x-2 hidden sm:block"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            D. GALLERY SECTION (Full-Width Filmstrip Carousel)
            ==================================================================== */}
        {carouselItems.length > 0 && (
          <section className="w-full py-12 sm:py-20 bg-black">
            <div className="landing-shell mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="mb-2">
                  <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em]">
                    <span className="text-[#ff2a3d] font-bold">02</span> / Gallery
                  </span>
                </div>
                <h2 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(32px,5vw,64px)] leading-[0.92]">
                  The arena, in frames.
                </h2>
              </div>
              <Link
                to="/gallery"
                className="border border-[#3a3a42] hover:border-[#ff2a3d] text-[#f4f4f6] hover:text-[#ff2a3d] font-mono text-xs uppercase px-5 py-2.5 tracking-wider transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
              >
                View all photos
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Full Bleed Filmstrip Stage */}
            <div className="w-full h-[clamp(540px,88vh,860px)]">
              <HeroCarousel
                items={carouselItems}
                autoplay={true}
                autoplayDelay={4500}
                className="w-full h-full"
              />
            </div>
          </section>
        )}

        {/* ====================================================================
            E. HALL OF FAME SECTION
            ==================================================================== */}
        <section className="landing-shell py-16 sm:py-28">
          <div className="mb-3">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em]">
              <span className="text-[#ff2a3d] font-bold">03</span> / Hall of fame
            </span>
          </div>

          <h2 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(36px,6vw,72px)] leading-[0.92] mb-12 sm:mb-16">
            {editionLabel} <span className="text-[#ff2a3d]">champions.</span>
          </h2>

          <PodiumDisplay podium={content?.podium} editionLabel={editionLabel} />
        </section>

        {/* ====================================================================
            F. THE PEOPLE SECTION
            ==================================================================== */}
        {content?.people && content.people.length > 0 && (
          <section className="landing-shell py-16 sm:py-24 hairline-t">
            <div className="mb-3">
              <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em]">
                <span className="text-[#ff2a3d] font-bold">04</span> / The people
              </span>
            </div>

            <h2 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(36px,6vw,72px)] leading-[0.92] mb-12 sm:mb-16">
              Behind the <span className="text-[#ff2a3d]">hammer.</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
              {content.people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}

        {/* ====================================================================
            G. CERTIFICATES SECTION
            ==================================================================== */}
        <section className="landing-shell py-16 sm:py-24 hairline-t">
          <div className="mb-3">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em]">
              <span className="text-[#ff2a3d] font-bold">05</span> / Certificates
            </span>
          </div>

          <h2 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(36px,6vw,72px)] leading-[0.92] mb-8 sm:mb-10">
            Your name. <span className="text-[#ff2a3d]">Your proof.</span>
          </h2>

          <div className="max-w-xl">
            <Link
              to="/my-certificates"
              className="flex items-center justify-between p-2 pl-5 bg-[#131316] hover:bg-[#18181c] border border-[#26262b] hover:border-[#ff2a3d] rounded-full transition-all group"
            >
              <div className="flex items-center gap-3">
                <Award size={18} className="text-[#8e8e99] group-hover:text-[#ff2a3d] transition-colors" />
                <span className="font-mono text-xs sm:text-sm text-[#8e8e99] group-hover:text-[#f4f4f6] transition-colors">
                  Enter your full name to unlock
                </span>
              </div>
              <span className="bg-[#ff2a3d] hover:bg-[#e02435] text-white font-mono text-xs uppercase px-5 py-2.5 rounded-full font-bold tracking-wider transition-colors">
                Unlock
              </span>
            </Link>
          </div>
        </section>

        {/* ====================================================================
            H. FINAL CALL SECTION
            ==================================================================== */}
        <section className="w-full hairline-t bg-[#0a0a0c] py-24 sm:py-36 text-center">
          <div className="landing-shell flex flex-col items-center">
            <h2
              className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.03em] mb-8 select-none"
              style={{ fontSize: 'clamp(48px, 9vw, 128px)', lineHeight: 0.88 }}
            >
              Be in the <span className="text-[#ff2a3d]">room.</span>
            </h2>
            <Link
              to="/live"
              className="bg-[#ff2a3d] hover:bg-[#e02435] text-white font-mono font-bold uppercase text-xs sm:text-sm px-8 py-4 tracking-widest transition-all inline-flex items-center gap-3 shadow-lg shadow-red-950/40"
            >
              <Radio size={16} className="animate-pulse" />
              Watch the live auction
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Live State Card Component ──
function LiveStateCard({
  eventState,
  editionLabel,
  currentBidAmount,
  timerFormatted,
  liveLoading,
}: {
  eventState: any;
  editionLabel: string;
  currentBidAmount: number;
  timerFormatted: string;
  liveLoading: boolean;
}) {
  if (liveLoading) {
    return (
      <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 animate-pulse">
        <div className="h-4 bg-[#26262b] rounded w-28 mb-3" />
        <div className="h-8 bg-[#26262b] rounded w-36" />
      </div>
    );
  }

  if (!eventState) {
    return null;
  }

  const gameState = eventState.game_state;
  const roundState = eventState.round_state;
  const roundNum = (eventState.current_round_index || 0) + 1;
  const qNum = (eventState.current_question_index || 0) + 1;

  // Active / Live Bidding
  if (gameState === 'active') {
    return (
      <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 mb-2 pb-2 hairline-b">
          <span className="font-mono text-xs uppercase tracking-wider text-[#8e8e99]">
            Round {roundNum} · Q{qNum}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#ff2a3d] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#ff2a3d] animate-ping" />
            Live
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-['Barlow_Semi_Condensed',sans-serif] text-2xl sm:text-3xl font-bold text-[#ff2a3d] leading-none">
            {formatCurrency(currentBidAmount)}
          </span>
          <span className="font-mono text-sm sm:text-base font-bold text-[#f4f4f6]">
            {timerFormatted}
          </span>
        </div>
      </div>
    );
  }

  // Not Started
  if (gameState === 'setup' || gameState === 'waiting_start') {
    return (
      <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 sm:p-5">
        <ShimmerText variant="red" className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest">
          AUCTION STARTING SOON
        </ShimmerText>
      </div>
    );
  }

  // Intermission
  if (gameState === 'intermission' || roundState === 'INTERMISSION') {
    return (
      <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 sm:p-5">
        <span className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#f4f4f6]">
          Round {roundNum} intermission
        </span>
      </div>
    );
  }

  // Results Pending
  if (roundState === 'LEADERBOARD_HIDDEN' || gameState === 'winner_reveal') {
    return (
      <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 sm:p-5">
        <span className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#f4f4f6]">
          Results will be announced soon
        </span>
      </div>
    );
  }

  // Completed / Leaderboard reveal
  return (
    <div className="bg-[#131316]/90 backdrop-blur-md border border-[#26262b] p-4 sm:p-5 flex items-center justify-between gap-4">
      <span className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#f4f4f6]">
        {editionLabel} complete
      </span>
      <Link
        to="/hall-of-fame"
        className="text-[#ff2a3d] hover:underline font-mono text-xs uppercase tracking-wider"
      >
        Hall of Fame →
      </Link>
    </div>
  );
}

// ── Podium Display Component (2nd, 1st, 3rd) ──
function PodiumDisplay({
  podium,
  editionLabel,
}: {
  podium: LandingContent['podium'] | undefined;
  editionLabel: string;
}) {
  const reducedMotion = useReducedMotion();

  const champion = podium?.champion;
  const runnerUp = podium?.runnerUp;
  const thirdPlace = podium?.thirdPlace;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center gap-6 sm:gap-8">
      {/* 2nd Place: Runner-up (Silver) */}
      <motion.div
        initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="order-2 md:order-1 flex-1 max-w-sm w-full"
      >
        <PodiumCard
          rankLabel="02 / RUNNER-UP"
          rankColor="#c0c0c0"
          teamName={runnerUp?.name || 'Runner-Up Team'}
          lots={runnerUp?.lots ?? 0}
          amount={runnerUp?.amount ?? 0}
          photoUrl={runnerUp?.photo_url}
          heightClass="h-[360px] sm:h-[400px]"
        />
      </motion.div>

      {/* 1st Place: Champion (Gold - Taller) */}
      <motion.div
        initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="order-1 md:order-2 flex-1 max-w-sm w-full"
      >
        <PodiumCard
          rankLabel="01 / CHAMPION"
          rankColor="#d4af37"
          teamName={champion?.name || 'Champion Team'}
          lots={champion?.lots ?? 0}
          amount={champion?.amount ?? 0}
          photoUrl={champion?.photo_url}
          heightClass="h-[420px] sm:h-[480px]"
          isChampion
        />
      </motion.div>

      {/* 3rd Place: Third Place (Bronze) */}
      <motion.div
        initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="order-3 flex-1 max-w-sm w-full"
      >
        <PodiumCard
          rankLabel="03 / THIRD PLACE"
          rankColor="#cd7f32"
          teamName={thirdPlace?.name || 'Third Place Team'}
          lots={thirdPlace?.lots ?? 0}
          amount={thirdPlace?.amount ?? 0}
          photoUrl={thirdPlace?.photo_url}
          heightClass="h-[340px] sm:h-[380px]"
        />
      </motion.div>
    </div>
  );
}

function PodiumCard({
  rankLabel,
  rankColor,
  teamName,
  lots,
  amount,
  photoUrl,
  heightClass,
  isChampion,
}: {
  rankLabel: string;
  rankColor: string;
  teamName: string;
  lots: number;
  amount: number;
  photoUrl?: string | null;
  heightClass: string;
  isChampion?: boolean;
}) {
  return (
    <div
      className={`relative w-full ${heightClass} bg-[#131316] border ${
        isChampion ? 'border-[#d4af37]/40 shadow-xl shadow-amber-950/20' : 'border-[#26262b]'
      } overflow-hidden group`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={teamName}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#131316] text-[#3a3a42]">
          <Trophy size={48} style={{ color: rankColor, opacity: 0.3 }} />
        </div>
      )}

      {/* Bottom Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end p-5 sm:p-6 pointer-events-none">
        <span
          className="font-mono text-xs uppercase tracking-[0.2em] font-bold mb-1"
          style={{ color: rankColor }}
        >
          {rankLabel}
        </span>
        <h3 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl sm:text-3xl text-white tracking-tight leading-tight mb-2">
          {teamName}
        </h3>
        <span className="font-mono text-xs text-[#8e8e99] uppercase tracking-wider">
          {lots} lots · {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );
}

// ── Person Card Component with Animated SVG Ring ──
function PersonCard({ person }: { person: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} className="person-card flex flex-col items-center text-center group cursor-default">
      {/* Circular Avatar Frame (max 220px) */}
      <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 mb-4 flex items-center justify-center">
        {/* SVG Animated Red Ring */}
        <svg
          viewBox="0 0 230 230"
          className="absolute inset-0 w-full h-full pointer-events-none -rotate-90"
        >
          <circle
            cx="115"
            cy="115"
            r="110"
            fill="none"
            stroke="#ff2a3d"
            strokeWidth="1.5"
            className={`svg-ring-circle ${isInView ? 'drawn' : ''}`}
          />
        </svg>

        {/* Circular photo container */}
        <div className="person-photo-wrap w-[86%] h-[86%] rounded-full overflow-hidden bg-[#18181c] border border-[#26262b]">
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#5a5a66]">
              <User size={40} />
            </div>
          )}
        </div>
      </div>

      {/* Name and Role */}
      <h3 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-lg sm:text-xl text-[#f4f4f6] tracking-tight leading-snug">
        {person.name || 'Member'}
      </h3>
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#8e8e99] mt-1">
        {person.role_label}
      </span>
    </div>
  );
}
