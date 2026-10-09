import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { HeroCarousel, type HeroCarouselItem } from '../components/ui/hero-carousel';
import { SmoothImage } from '../components/ui/smooth-image';
import { getLandingContent, type LandingContent } from '../services/contentService';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { useTimer } from '../hooks/useTimer';
import { formatCurrency } from '../utils/formatters';
import { getRoundBasePrice } from '../data/roundsData';
import { formatCredit, splitFacts } from '../lib/gallery-text';
import { supabase } from '../lib/supabase';
import './LandingPage.css';

const getCachedHeroImage = (): string => {
  try {
    return localStorage.getItem('gcl_cached_hero_image_url') || '';
  } catch (e) {
    return '';
  }
};

const CAM_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const USR_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

const ARROW_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

const CHEVRON_DOWN_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CLOSE_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

interface FormatStepDef {
  n: string;
  title: string;
  sub: string;
  tagline: string;
  desc: string;
  highlights: string[];
}

const FORMAT_STEPS: FormatStepDef[] = [
  {
    n: '01',
    title: 'Bid live',
    sub: 'A question goes on the block.',
    tagline: 'High-stakes real-time bidding',
    desc: 'Each technical challenge is presented on the live tournament floor with an opening base price. Teams place real-time bids under an aggressive countdown clock. Every bid raises the stakes for the right to answer and score.',
    highlights: [
      'Base price begins at ₹20 Lakhs per question',
      'Rapid-fire 15-second bidding intervals',
      'Dynamic bidding ladder with instant team validation',
    ],
  },
  {
    n: '02',
    title: 'Win the question',
    sub: 'Highest bid answers it.',
    tagline: 'Exclusive solve & score rights',
    desc: 'When the auction hammer falls, the highest bidding team wins exclusive ownership of the problem. They take the hot seat to solve the algorithm or system design question within the allotted time to secure championship points.',
    highlights: [
      'Only the winning team gets to attempt the solution',
      'Full point award for verified correct solutions',
      'Unsolved challenges forfeit bidding capital without points',
    ],
  },
  {
    n: '03',
    title: 'Spend with strategy',
    sub: 'Every crore is a choice.',
    tagline: 'Mastering the tournament purse',
    desc: 'Every team begins with a strictly capped purse of ₹5 Crore. Every rupee spent is gone forever, while unspent funds carry into subsequent rounds. Balancing question acquisition with budget preservation separates contenders from champions.',
    highlights: [
      'Fixed ₹5.00 Cr starting purse for all 15 teams',
      'Live budget depletion visible across the arena board',
      'Strategic bankroll management for decisive late-round questions',
    ],
  },
  {
    n: '04',
    title: 'Reach the podium',
    sub: 'Revealed from the bottom up.',
    tagline: 'Championship glory and recognition',
    desc: 'After 3 demanding rounds, scores and lots are audited. The Grand Reveal counts down in dramatic sequence from third place to the crowned Grand Champions of Gen Code League, followed by official digital certificate issuance.',
    highlights: [
      'Top 3 teams secure the podium trophies',
      'Tamper-proof verifiable digital certificates issued to all finalists',
      'Permanent induction into the official GCL Hall of Fame',
    ],
  },
];

const TICKER_ITEMS = [
  { round: 'R1·Q1', team: 'Team 1', amt: '₹70.00 L' },
  { round: 'R1·Q2', team: 'Team 2', amt: '₹70.00 L' },
  { round: 'R1·Q3', team: 'Team 14', amt: '₹1.20 Cr' },
  { round: 'R2·Q1', team: 'Team 10', amt: '₹2.00 Cr' },
  { round: 'R2·Q2', team: 'Team 15', amt: '₹1.20 Cr' },
  { round: 'R3·Q1', team: 'Team 3', amt: '₹90.00 L' },
];

interface TeamMemberDef {
  key: string;
  name: string;
  role: string;
  photo_url?: string | null;
  isLead?: boolean;
}

interface TeamGroupDef {
  header: string;
  key: string;
  role: string;
  size: 'lg' | 'md' | 'sm';
  isLead?: boolean;
  max?: number;
  members: TeamMemberDef[];
}

export default function LandingPage() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const { eventState, edition } = useEventState();
  const { teams } = useTeams(edition?.id);
  const { formatted: timerFormatted } = useTimer(eventState);

  // Format step interactive pop-up
  const [activeFormatStep, setActiveFormatStep] = useState<FormatStepDef | null>(null);

  // Teams accordion & more toggles
  const [openTeam, setOpenTeam] = useState<'event' | 'tech' | null>(null);
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [notchLeft, setNotchLeft] = useState<number>(200);

  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pfRef = useRef<HTMLDivElement>(null);
  const pncRef = useRef<HTMLDivElement>(null);
  const eventBtnRef = useRef<HTMLButtonElement>(null);
  const techBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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
      }
    }
    loadContent();
  }, []);

  // Scroll progress bar & Reveal on scroll
  useEffect(() => {
    const handleScroll = () => {
      const d = document.documentElement;
      const pg = document.getElementById('pg');
      if (pg) {
        const pct = (window.scrollY / Math.max(1, d.scrollHeight - window.innerHeight)) * 100;
        pg.style.width = `${pct}%`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      io.disconnect();
    };
  }, [content, openTeam]);

  // Canvas price-lines with hammer ripples and 3D photo tilt
  useEffect(() => {
    const hero = heroRef.current;
    const cv = canvasRef.current;
    if (!hero || !cv) return;

    const cx = cv.getContext('2d');
    if (!cx) return;

    const N = 32;
    let W = 0;
    let H = 0;
    const DP = Math.min(window.devicePixelRatio || 1, 2);
    const hits: { x: number; y: number; t: number }[] = [];
    let mx = -999;
    let my = -999;
    let vis = true;
    let animId: number;

    const rs = () => {
      W = hero.clientWidth;
      H = hero.clientHeight;
      cv.width = W * DP;
      cv.height = H * DP;
      cx.setTransform(DP, 0, 0, DP, 0, 0);
    };
    rs();
    window.addEventListener('resize', rs);

    const hit = (x?: number, y?: number) => {
      hits.push({
        x: x ?? W * (0.62 + Math.random() * 0.2),
        y: y ?? H * (0.35 + Math.random() * 0.3),
        t: performance.now() / 1000,
      });
      if (hits.length > 4) hits.shift();
    };

    const frame = () => {
      if (!vis) {
        animId = requestAnimationFrame(frame);
        return;
      }
      const t = performance.now() / 1000;
      cx.clearRect(0, 0, W, H);

      for (let l = 0; l < N; l++) {
        const by = H * (0.04 + (0.94 * l) / (N - 1));
        cx.beginPath();
        for (let x = 0; x <= W + 10; x += 10) {
          let y =
            by +
            Math.sin(x * 0.0042 + t * 0.55 + l * 0.34) * 13 +
            Math.sin(x * 0.012 - t * 0.8 + l * 0.2) * 5;
          const dx = x - mx;
          const dy = by - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < 60000) {
            y += Math.sign(dy || 1) * Math.exp(-d2 / 22000) * 30;
          }
          for (const h of hits) {
            const age = t - h.t;
            if (age > 3.2) continue;
            const d = Math.hypot(x - h.x, by - h.y);
            y +=
              Math.sin(d * 0.045 - age * 8) *
              Math.exp(-d / 280) *
              Math.exp(-age * 1.25) *
              38;
          }
          if (x === 0) cx.moveTo(x, y);
          else cx.lineTo(x, y);
        }
        cx.strokeStyle =
          l % 8 === 0
            ? 'rgba(245,183,59,.40)'
            : l % 8 === 4
            ? 'rgba(255,42,61,.34)'
            : 'rgba(255,255,255,.11)';
        cx.lineWidth = l % 4 === 0 ? 1.4 : 1;
        cx.stroke();
      }
      animId = requestAnimationFrame(frame);
    };
    animId = requestAnimationFrame(frame);

    const onPointerMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      if (pfRef.current) {
        const f = pfRef.current.getBoundingClientRect();
        const x = (e.clientX - f.left) / f.width - 0.5;
        const y = (e.clientY - f.top) / f.height - 0.5;
        pfRef.current.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      }
    };

    const onPointerLeave = () => {
      mx = my = -999;
      if (pfRef.current) pfRef.current.style.transform = '';
    };

    const onClick = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      hit(e.clientX - r.left, e.clientY - r.top);
    };

    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('pointerleave', onPointerLeave);
    hero.addEventListener('click', onClick);

    const observer = new IntersectionObserver((entries) => {
      vis = entries[0].isIntersecting;
    });
    observer.observe(hero);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', rs);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      hero.removeEventListener('click', onClick);
      observer.disconnect();
    };
  }, []);

  // Notch position update when team panel opens or switches
  const updateNotch = (teamKey: 'event' | 'tech') => {
    const btn = teamKey === 'event' ? eventBtnRef.current : techBtnRef.current;
    const card = pncRef.current;
    if (btn && card) {
      const bRect = btn.getBoundingClientRect();
      const cRect = card.getBoundingClientRect();
      setNotchLeft(bRect.left + bRect.width / 2 - cRect.left);
    }
  };

  useEffect(() => {
    if (openTeam) {
      updateNotch(openTeam);
    }
  }, [openTeam]);

  const toggleTeamPanel = (teamKey: 'event' | 'tech') => {
    if (openTeam === teamKey) {
      setOpenTeam(null);
    } else if (openTeam) {
      setSwitchingTeam(true);
      setTimeout(() => {
        setOpenTeam(teamKey);
        setSwitchingTeam(false);
        updateNotch(teamKey);
      }, 230);
    } else {
      setOpenTeam(teamKey);
      setTimeout(() => updateNotch(teamKey), 50);
    }
  };

  const rawEdition = content?.settings?.edition_label || edition?.name || 'GCL 2026';
  const editionLabel = rawEdition.includes('2025') ? rawEdition.replace('2025', '2026') : (rawEdition || 'GCL 2026');
  const heroImage = content?.settings?.hero_image_url || getCachedHeroImage();

  useEffect(() => {
    if (content?.settings?.hero_image_url) {
      try {
        localStorage.setItem('gcl_cached_hero_image_url', content.settings.hero_image_url);
      } catch (e) {}
    }
  }, [content?.settings?.hero_image_url]);

  // Carousel Items mapped strictly per prompt:
  // { id: r.id, title: r.title ?? "", image: r.photo_url || r.image_url,
  //   credit: formatCredit(r.credit),
  //   meta: splitFacts(r.description).length ? splitFacts(r.description) : (Array.isArray(r.meta) ? r.meta : splitFacts(r.meta)) }
  const [galleryItems, setGalleryItems] = useState<HeroCarouselItem[]>([]);

  useEffect(() => {
    async function fetchCarousel() {
      try {
        let rows: any[] | null = null;
        const resItems = await supabase
          .from('gallery_items')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(12);

        if (!resItems.error && resItems.data && resItems.data.length > 0) {
          rows = resItems.data;
        } else {
          const resPhotos = await supabase
            .from('gallery_photos')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true })
            .limit(12);
          if (!resPhotos.error && resPhotos.data) {
            rows = resPhotos.data;
          }
        }

        if (rows && rows.length > 0) {
          const mapped: HeroCarouselItem[] = rows.map((r, i) => {
            const descFacts = splitFacts(r.description);
            const metaFacts = descFacts.length
              ? descFacts
              : Array.isArray(r.meta)
              ? r.meta
              : splitFacts(r.meta as any);
            return {
              id: r.id ?? `photo-${i}`,
              title: r.title ?? '',
              image: r.photo_url || r.image_url || '',
              credit: formatCredit(r.credit),
              meta: metaFacts,
              accent: r.accent || undefined,
            };
          });
          setGalleryItems(mapped);
        }
      } catch (e) {
        console.warn('Error loading gallery items for landing:', e);
      }
    }
    fetchCarousel();
  }, []);

  const carouselItems: HeroCarouselItem[] = useMemo(() => {
    if (galleryItems.length > 0) return galleryItems;
    // Default initial filmstrip frames from reference
    return [
      {
        id: 'def-1',
        title: 'Opening\nRound',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'ROUND 1', 'ARENA'],
      },
      {
        id: 'def-2',
        title: 'Bidding\nFloor',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'ROUND 1', 'LIVE'],
      },
      {
        id: 'def-3',
        title: 'The Hammer\nDrops',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'ROUND 2', 'HAMMER'],
      },
      {
        id: 'def-4',
        title: 'Team\nHuddle',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'STRATEGY', 'TEAMS'],
      },
      {
        id: 'def-5',
        title: 'Podium\nReveal',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'FINAL', 'PODIUM'],
      },
      {
        id: 'def-6',
        title: 'Certificate\nHandover',
        image: '',
        credit: 'BY GCL MEDIA TEAM.',
        meta: ['GCL 2025', 'AWARDS', 'CERTIFICATES'],
      },
    ];
  }, [galleryItems]);

  // Live state values
  const roundNum = (eventState?.current_round_index || 0) + 1;
  const qNum = (eventState?.current_question_index || 0) + 1;
  const roundBasePrice = edition?.base_price || getRoundBasePrice(eventState?.current_round_index || 0);
  const currentBidAmt = eventState?.current_bid_preview?.amount || roundBasePrice || 9000000;
  const bidAmtFormatted = formatCurrency(currentBidAmt);

  const totalTeams = teams && teams.length > 0 ? teams.length : 15;
  const startingBudgetCr = edition?.starting_budget
    ? (edition.starting_budget / 10000000).toFixed(0)
    : '15';
  const totalRounds = edition?.total_rounds ?? 3;
  const questionsPerRound = edition?.questions_per_round ?? 20;

  // Podium champions
  const podium = content?.podium;
  const grandChamp = podium?.champion;
  const runnerUp = podium?.runnerUp;
  const thirdPlace = podium?.thirdPlace;

  // ── Leadership Tier Split (3 in top line, 2 in bottom line) ──
  const peopleDb = content?.people || [];

  // Exclude Student Coordinator and Developer from the top tier
  const isBottomLead = (p: typeof peopleDb[0]) => {
    const r = (p.role_label || '').toLowerCase();
    const n = (p.name || '').toLowerCase();
    return (
      r.includes('student') ||
      r.includes('developer') ||
      r.includes('dev') ||
      n.includes('avaneesh') ||
      n.includes('manthan')
    );
  };

  // Top 3 faculty/department leadership members sorted strictly by sort_order
  const topTierDb = peopleDb
    .filter((p) => (!p.category || p.category === 'leadership') && !isBottomLead(p))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Fixed top tier values (Principal, H.O.D, Faculty coordinator)
  const defaultTopTier = [
    { name: 'Dr. Prashanth Banakar', role: 'Principal', photo_url: null },
    { name: 'Dr. Maheshkumar Patil', role: 'H.O.D', photo_url: null },
    { name: 'Prof. Amrutha Naveen', role: 'Faculty coordinator', photo_url: null },
  ];

  // Top row: strictly in the arranged position order (Position 1, Position 2, Position 3)
  const facultyPeopleList = [0, 1, 2].map((idx) => {
    const dbPerson = topTierDb[idx];
    const fallback = defaultTopTier[idx] || defaultTopTier[0];
    return {
      k: dbPerson?.id || `faculty_${idx}`,
      r: dbPerson?.role_label || fallback.role,
      n: dbPerson?.name || fallback.name,
      photo_url: dbPerson?.photo_url || fallback.photo_url,
      l: false,
    };
  });

  // Bottom 2 leads: Student Coordinator and Developer (matching by role or name)
  const studentPerson = peopleDb.find((p) => {
    const r = (p.role_label || '').toLowerCase();
    const n = (p.name || '').toLowerCase();
    return r.includes('student') || n.includes('avaneesh');
  });

  const devPerson = peopleDb.find((p) => {
    const r = (p.role_label || '').toLowerCase();
    const n = (p.name || '').toLowerCase();
    return r.includes('developer') || r.includes('dev') || n.includes('manthan');
  });

  // Bottom row: 2 student / developer leads down (fixed values with uploaded photos)
  const leadPeopleList = [
    {
      k: 'student',
      r: studentPerson?.role_label || 'Student coordinator',
      n: studentPerson?.name || 'Avaneesh Bhirdi',
      photo_url: studentPerson?.photo_url || null,
      l: true,
      toggle: 'event' as const,
      bl: 'event team',
    },
    {
      k: 'dev',
      r: devPerson?.role_label || 'Developer',
      n: devPerson?.name || 'Manthan Patel',
      photo_url: devPerson?.photo_url || null,
      l: true,
      toggle: 'tech' as const,
      bl: 'technical team',
    },
  ];

  // ── Teams Definition: Dynamic from database with graceful reference fallback ──
  const nm = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

  const teamsData: Record<'event' | 'tech', { title: string; groups: TeamGroupDef[] }> = useMemo(() => {
    const allDbPeople = content?.people || [];
    const dbEventPeople = allDbPeople.filter((p) => p.category === 'event');
    const dbTechPeople = allDbPeople.filter((p) => p.category === 'tech');

    // 1. Build Event Team Groups
    let eventGroups: TeamGroupDef[] = [];
    if (dbEventPeople.length > 0) {
      const groupMap = new Map<string, typeof dbEventPeople>();
      dbEventPeople.forEach((p) => {
        const gName = p.group_name?.trim() || p.role_label?.trim() || 'Event coordinators';
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        groupMap.get(gName)!.push(p);
      });

      eventGroups = Array.from(groupMap.entries()).map(([gName, members], gIdx) => {
        const isLead =
          gName.toLowerCase().includes('lead') ||
          gName.toLowerCase().includes('main') ||
          members.some((m) => m.role_label?.toLowerCase().includes('main'));
        const size: 'lg' | 'md' | 'sm' = isLead
          ? 'lg'
          : gName.toLowerCase().includes('coord')
          ? 'sm'
          : 'md';

        return {
          header: gName,
          key: `event_grp_${gIdx}`,
          role: members[0]?.role_label || 'Event coordinator',
          size,
          isLead,
          members: members.map((m, mIdx) => ({
            key: m.id || `event_mem_${gIdx}_${mIdx}`,
            name: m.name || `Coordinator ${mIdx + 1}`,
            role: m.role_label || 'Event coordinator',
            photo_url: m.photo_url || null,
            isLead,
          })),
        };
      });
    } else {
      // Default fallback
      eventGroups = [
        {
          header: 'Main event coordinators',
          key: 'event_lead',
          role: 'Main event coordinator',
          size: 'lg',
          isLead: true,
          members: [
            {
              key: 'event_lead_1',
              name: 'Main coordinator 1',
              role: 'Main event coordinator',
              photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              isLead: true,
            },
            {
              key: 'event_lead_2',
              name: 'Main coordinator 2',
              role: 'Main event coordinator',
              photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
              isLead: true,
            },
          ],
        },
        {
          header: 'Speakers',
          key: 'speaker',
          role: 'Speaker',
          size: 'md',
          members: nm('Speaker', 4).map((name, i) => ({
            key: `speaker_${i + 1}`,
            name,
            role: 'Speaker',
            photo_url: `https://images.unsplash.com/photo-${1500000000000 + i * 10000}?auto=format&fit=crop&w=300&q=80`,
          })),
        },
        {
          header: 'Camera team',
          key: 'camera',
          role: 'Camera team',
          size: 'md',
          members: nm('Camera member', 4).map((name, i) => ({
            key: `camera_${i + 1}`,
            name,
            role: 'Camera team',
            photo_url: null,
          })),
        },
        {
          header: 'Event coordinators',
          key: 'event_coord',
          role: 'Event coordinator',
          size: 'sm',
          members: nm('Event coordinator', 13).map((name, i) => ({
            key: `event_coord_${i + 1}`,
            name,
            role: 'Event coordinator',
            photo_url:
              i < 4
                ? `https://images.unsplash.com/photo-${1510000000000 + i * 10000}?auto=format&fit=crop&w=200&q=80`
                : null,
          })),
        },
      ];
    }

    // 2. Build Technical Team Groups
    let techGroups: TeamGroupDef[] = [];
    if (dbTechPeople.length > 0) {
      const groupMap = new Map<string, typeof dbTechPeople>();
      dbTechPeople.forEach((p) => {
        const gName = p.group_name?.trim() || p.role_label?.trim() || 'Technical members';
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        groupMap.get(gName)!.push(p);
      });

      techGroups = Array.from(groupMap.entries()).map(([gName, members], gIdx) => {
        return {
          header: gName,
          key: `tech_grp_${gIdx}`,
          role: members[0]?.role_label || 'Technical team',
          size: 'md',
          members: members.map((m, mIdx) => ({
            key: m.id || `tech_mem_${gIdx}_${mIdx}`,
            name: m.name || `Technical member ${mIdx + 1}`,
            role: m.role_label || 'Technical team',
            photo_url: m.photo_url || null,
          })),
        };
      });
    } else {
      techGroups = [
        {
          header: 'Technical members',
          key: 'tech',
          role: 'Technical team',
          size: 'md',
          members: nm('Technical member', 10).map((name, i) => ({
            key: `tech_${i + 1}`,
            name,
            role: 'Technical team',
            photo_url: null,
          })),
        },
      ];
    }

    return {
      event: {
        title: 'Event team',
        groups: eventGroups,
      },
      tech: {
        title: 'Technical team',
        groups: techGroups,
      },
    };
  }, [content?.people]);

  const handleImageFail = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="gcl-landing">
      {/* Scroll indicator bar */}
      <div id="pg" />

      {/* Universal Nav */}
      <Header viewMode="live" onToggleView={() => {}} />

      {/* ── HERO SECTION ── */}
      <header className="hero" id="hero" ref={heroRef}>
        <canvas id="wv" ref={canvasRef} />
        <div className="c hg">
          <div>
            <div className="k">Technical auction event / {editionLabel}</div>
            <h1>
              <span className="ln">
                <span>Where code meets</span>
              </span>
              <span className="ln">
                <span>
                  the <em>hammer.</em>
                </span>
              </span>
            </h1>
            <p className="lead">A live auction for engineers. Bid, answer, win.</p>
            <div className="cta">
              <Link className="btn b-red" to="/live">
                Watch live {ARROW_SVG}
              </Link>
              <a className="btn b-line" href="#gal">
                Gallery
              </a>
            </div>
          </div>

          <div className="pf" id="pf" ref={pfRef}>
            <div className="im" data-slot="hero_image">
              <SmoothImage
                src={heroImage}
                alt={`${editionLabel} Event Arena`}
                fetchPriority="high"
                className="w-full h-full object-cover"
                wrapperClassName="w-full h-full"
                fallback={
                  <span>
                    {CAM_SVG}
                    Hero photo · 4:5
                  </span>
                }
              />
            </div>
            <svg className="rg" viewBox="0 0 120 120">
              <defs>
                <path id="cp" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
              </defs>
              <text>
                <textPath href="#cp">GCL · TECHNICAL AUCTION · GEN CODE LEAGUE ·</textPath>
              </text>
            </svg>
            <div className="rgi">GCL</div>

            <div className="lc card" data-bind="live.round · live.question · live.bid · live.timer">
              <div className="k">
                <span id="lq">Round {roundNum} · Q{qNum}</span>
                <span className="lv">
                  <span className="dot" />
                  <span id="ls">Live</span>
                </span>
              </div>
              <div className="r">
                <div className="amt" id="am">
                  {bidAmtFormatted}
                </div>
                <div className="tm" id="tm">
                  {timerFormatted || '01:57'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── TICKER ── */}
      <div className="tick">
        <div id="tk">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, idx) => (
            <span key={idx}>
              {t.round} <b>{t.team}</b> <em>{t.amt}</em>
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <section className="strip">
        <div className="c">
          <div className="sc" data-bind="teams.count">
            <b id="s1">{totalTeams}</b>
            <span className="k">Teams</span>
          </div>
          <div className="sc" data-bind="settings.starting_budget">
            <b>
              ₹<span id="s2">{startingBudgetCr}</span> Cr
            </b>
            <span className="k">Budget per team</span>
          </div>
          <div className="sc" data-bind="settings.rounds">
            <b id="s3">{totalRounds}</b>
            <span className="k">Rounds</span>
          </div>
          <div className="sc" data-bind="settings.questions_per_round">
            <b id="s4">{questionsPerRound}</b>
            <span className="k">Questions per round</span>
          </div>
        </div>
      </section>

      {/* ── 01 / THE FORMAT ── */}
      <section className="sec" style={{ paddingTop: 'clamp(40px,5vw,70px)' }}>
        <div className="c">
          <div className="k">01 / The format</div>
          <h2 className="st">
            Four moves.
            <br />
            <em>One champion.</em>
          </h2>
          <div className="fm" id="fm">
            {FORMAT_STEPS.map((f) => (
              <div
                key={f.n}
                className="fr rv"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveFormatStep(f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveFormatStep(f);
                  }
                }}
              >
                <span className="n">{f.n}</span>
                <h3>
                  {f.title}
                  <small>{f.sub}</small>
                </h3>
                {ARROW_SVG}
              </div>
            ))}
          </div>

          {/* Interactive Pop-up Explaining the Format Step on Click */}
          {activeFormatStep && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-fade-in"
              onClick={() => setActiveFormatStep(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="format-popup-title"
            >
              <div
                className="relative max-w-lg w-full p-6 sm:p-8 rounded-2xl bg-[#0c0c11] border border-[#ff2a3d]/40 shadow-[0_0_60px_rgba(255,42,61,0.3)] text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#24242c]">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded bg-[#2a0c12] border border-[#ff2a3d] text-[#ff8791] font-mono text-xs font-bold">
                      MOVE {activeFormatStep.n}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#8e8e9a]">
                      Tournament Rules
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <h3
                      id="format-popup-title"
                      className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white font-['Barlow_Semi_Condensed',sans-serif]"
                    >
                      {activeFormatStep.title}
                    </h3>
                    <p className="text-[#ff4350] text-sm font-semibold mt-1">
                      {activeFormatStep.tagline}
                    </p>
                  </div>

                  <p className="text-[#c9c9d2] text-sm sm:text-base leading-relaxed">
                    {activeFormatStep.desc}
                  </p>

                  <div className="p-4 rounded-xl bg-[#14141a] border border-[#24242c] space-y-2 mt-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8e8e9a] block font-bold">
                      Key Highlights & Mechanics
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#e4e4e9] font-mono">
                      {activeFormatStep.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#ff2a3d] font-bold">›</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#24242c] flex items-center justify-between">
                  <span className="text-xs text-[#71717a] font-mono">Click anywhere outside to close</span>
                  <button
                    type="button"
                    onClick={() => setActiveFormatStep(null)}
                    className="btn b-red px-5 py-2 text-xs font-mono uppercase tracking-wider rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 02 / GALLERY (CAROUSEL) ── */}
      <section id="gal" style={{ paddingBlock: 'clamp(60px,8vw,110px) 0' }}>
        <div className="c">
          <div className="gh">
            <div>
              <div className="k">02 / Gallery</div>
              <h2 className="st">
                The arena,
                <br />
                in <em>frames.</em>
              </h2>
            </div>
            <Link className="btn b-line" to="/gallery">
              View all photos {ARROW_SVG}
            </Link>
          </div>
        </div>
        <div className="hc-stage-wrap" id="hc1">
          <HeroCarousel
            items={carouselItems}
            autoplay={true}
            autoplayDelay={4500}
            className="w-full h-full"
          />
        </div>
      </section>

      {/* ── 03 / HALL OF FAME ── */}
      <section className="sec">
        <div className="c">
          <div className="k">03 / Hall of fame</div>
          <h2 className="st">
            {editionLabel}
            <br />
            <em>champions.</em>
          </h2>
          <div className="cg">
            {/* Runner-up (Silver, 4/5) */}
            <div className="card cd s rv">
              <div className="im" style={{ aspectRatio: '4/5' }}>
                <SmoothImage
                  src={runnerUp?.photo_url}
                  alt={runnerUp?.name || 'Runner-up'}
                  loading="lazy"
                  wrapperClassName="w-full h-full"
                  className="object-cover"
                  fallback={
                    <span>
                      {CAM_SVG}
                      Runner-up photo
                    </span>
                  }
                />
              </div>
              <div className="ov">
                <div className="t">02 · Runner-up</div>
                <h4>{runnerUp?.name || 'Team N – TEAM SSVA'}</h4>
                <small>
                  {runnerUp?.lots ? `${runnerUp.lots} lots` : '6 lots'} ·{' '}
                  {runnerUp?.amount ? formatCurrency(runnerUp.amount) : '₹13.40 Cr'}
                </small>
              </div>
            </div>

            {/* Champion (Gold, 4/5.4) */}
            <div className="card cd g rv">
              <div className="im" style={{ aspectRatio: '4/5.4' }}>
                <SmoothImage
                  src={grandChamp?.photo_url}
                  alt={grandChamp?.name || 'Grand champion'}
                  loading="lazy"
                  wrapperClassName="w-full h-full"
                  className="object-cover"
                  fallback={
                    <span>
                      {CAM_SVG}
                      Champion photo
                    </span>
                  }
                />
              </div>
              <div className="ov">
                <div className="t">01 · Grand champion</div>
                <h4>{grandChamp?.name || 'Team I – Jetha ke Jabaz'}</h4>
                <small>
                  {grandChamp?.lots ? `${grandChamp.lots} lots` : '4 lots'} ·{' '}
                  {grandChamp?.amount ? formatCurrency(grandChamp.amount) : '₹9.70 Cr'}
                </small>
              </div>
            </div>

            {/* Third place (Bronze, 4/4.6) */}
            <div className="card cd b rv">
              <div className="im" style={{ aspectRatio: '4/4.6' }}>
                <SmoothImage
                  src={thirdPlace?.photo_url}
                  alt={thirdPlace?.name || 'Third place'}
                  loading="lazy"
                  wrapperClassName="w-full h-full"
                  className="object-cover"
                  fallback={
                    <span>
                      {CAM_SVG}
                      Third place photo
                    </span>
                  }
                />
              </div>
              <div className="ov">
                <div className="t">03 · Third place</div>
                <h4>{thirdPlace?.name || 'Team M – Script Squad'}</h4>
                <small>
                  {thirdPlace?.lots ? `${thirdPlace.lots} lots` : '4 lots'} ·{' '}
                  {thirdPlace?.amount ? formatCurrency(thirdPlace.amount) : '₹9.70 Cr'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 / THE PEOPLE ── */}
      <section className="sec" style={{ paddingTop: 'clamp(60px,8vw,100px)' }}>
        <div className="c">
          <div className="k">04 / The people</div>
          <h2 className="st">
            Behind the <em>hammer.</em>
          </h2>

          {/* Top Row: 3 in one line (H.O.D + 2 Faculty Coordinators) */}
          <div className="tp tp-top" id="tp-top">
            {facultyPeopleList.map((p) => (
              <div key={p.k} className="pz">
                <div className="pe xl rv">
                  <div className="av">
                    <div className="im">
                      <SmoothImage
                        src={p.photo_url}
                        alt={p.n}
                        loading="lazy"
                        wrapperClassName="w-full h-full rounded-full"
                        className="object-cover"
                        fallback={<span>{USR_SVG}</span>}
                      />
                    </div>
                    <svg className="rgg" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="49.2" />
                    </svg>
                  </div>
                  <h4>{p.n}</h4>
                  <span className="k">{p.r}</span>
                  {p.l && <span className="ld">Lead</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Row: 2 down (Student Coordinator Lead + Developer Lead) */}
          <div className="tp tp-bottom" id="tp-bottom">
            {leadPeopleList.map((p) => (
              <div key={p.k} className="pz">
                <div className="pe xl rv">
                  <div className="av">
                    <div className="im">
                      <SmoothImage
                        src={p.photo_url}
                        alt={p.n}
                        loading="lazy"
                        wrapperClassName="w-full h-full rounded-full"
                        className="object-cover"
                        fallback={<span>{USR_SVG}</span>}
                      />
                    </div>
                    <svg className="rgg" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="49.2" />
                    </svg>
                  </div>
                  <h4>{p.n}</h4>
                  <span className="k">{p.r}</span>
                  {p.l && <span className="ld">Lead</span>}
                </div>

                {p.toggle && (
                  <button
                    ref={p.toggle === 'event' ? eventBtnRef : techBtnRef}
                    className="vb"
                    data-b={p.toggle}
                    aria-expanded={openTeam === p.toggle}
                    aria-controls="pnw"
                    onClick={() => toggleTeamPanel(p.toggle!)}
                  >
                    <span>
                      <span className="vw">{openTeam === p.toggle ? 'Hide' : 'View'} </span>
                      <span className="tl">{p.bl}</span>
                    </span>
                    {CHEVRON_DOWN_SVG}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Collapsible Teams Panel */}
          <div
            className={`pnw ${openTeam ? 'open' : ''}`}
            id="pnw"
            role="region"
            aria-label="Team members"
          >
            <div>
              <div id="pn" className={switchingTeam ? 'sw' : ''}>
                {openTeam && (
                  <div className="pnc card" ref={pncRef}>
                    <i className="nt" style={{ left: `${notchLeft}px` }} />
                    <div className="phd">
                      <h3>{teamsData[openTeam].title}</h3>
                      <button className="cls" onClick={() => setOpenTeam(null)}>
                        Close
                      </button>
                    </div>

                    {teamsData[openTeam].groups.map((group) => {
                      // Display all members immediately - no hidden cutoff
                      const displayedMembers = group.members;

                      // Split into members with valid loaded photos vs without photos
                      const withPhoto = displayedMembers.filter(
                        (m) => Boolean(m.photo_url?.trim()) && !failedImages[m.key]
                      );
                      const withoutPhoto = displayedMembers.filter(
                        (m) => !Boolean(m.photo_url?.trim()) || failedImages[m.key]
                      );

                      const totalCount = group.members.length;

                      return (
                        <div key={group.key} className="grp">
                          {/* Group header with counter */}
                          <div className="gh2">
                            <span className="k">{group.header}</span>
                            <b>{String(totalCount).padStart(2, '0')}</b>
                            <i />
                          </div>

                          {/* Avatar circles for members WITH photos */}
                          {withPhoto.length > 0 && (
                            <div className={`gc ${group.size}`}>
                              {withPhoto.map((member, i) => (
                                <div
                                  key={member.key}
                                  className={`pe ${group.size} on fi`}
                                  style={{ '--d': i } as any}
                                >
                                  <div className="av">
                                    <div className="im">
                                      <SmoothImage
                                        src={member.photo_url}
                                        alt={member.name}
                                        loading="lazy"
                                        wrapperClassName="w-full h-full rounded-full"
                                        className="object-cover"
                                        onFail={() => handleImageFail(member.key)}
                                      />
                                    </div>
                                    <svg className="rgg" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r="49.2" />
                                    </svg>
                                  </div>
                                  <h4>{member.name}</h4>
                                  <span className="k">{member.role}</span>
                                  {member.isLead && <span className="ld">Lead</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Name tiles in .gn grid for members WITHOUT photos */}
                          {withoutPhoto.length > 0 && (
                            <div className="gn">
                              {withoutPhoto.map((member, i) => (
                                <div
                                  key={member.key}
                                  className="pn fi"
                                  style={{ '--d': i } as any}
                                >
                                  <b>{member.name}</b>
                                  <span className="k">{member.role}</span>
                                  {member.isLead && <span className="ld">Lead</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 05 / CERTIFICATES ── */}
      <section className="sec">
        <div className="c">
          <div className="card cb">
            <div className="vt">
              <div>
                <div className="k">05 / Certificates</div>
                <h2 className="st">
                  Your name.
                  <br />
                  <em>Your proof.</em>
                </h2>
              </div>
              <div className="rv">
                <Link
                  to="/my-certificates"
                  className="fld cursor-pointer hover:border-[#ff2a3d] transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  <span>Enter your full name to unlock</span>
                  <span className="btn b-red">
                    Unlock
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="fin">
        <div className="c">
          <h2>
            Be in the <em>room.</em>
          </h2>
          <Link className="btn b-red" to="/live">
            Watch the live auction
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="c">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}>
              GC<b>L</b>
            </div>
            Gen Code League · Technical auction event
            <br />
            Developed by{' '}
            <a
              href="https://manthantp-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ff2a3d', textDecoration: 'none' }}
              className="hover:underline font-semibold"
            >
              @Manthan Patel
            </a>
          </div>
          <div>
            <h5>Watch</h5>
            <Link to="/live">Live auction</Link>
            <Link to="/hall-of-fame">Hall of Fame</Link>
            <Link to="/gallery">Gallery</Link>
          </div>
          <div>
            <h5>Participants</h5>
            <Link to="/my-certificates">Certificates</Link>
            <Link to="/announcements">Updates</Link>
            <Link to="/faq">FAQ</Link>
          </div>
          <div>
            <h5>Event</h5>
            <a href="#">GCL 2025</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
