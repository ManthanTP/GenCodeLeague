"use client";

import { useEffect, useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import {
  HeroCarousel,
  type HeroCarouselItem,
} from '../components/ui/hero-carousel';
import { SmoothImage } from '../components/ui/smooth-image';
import { supabase } from '../lib/supabase';
import { formatCredit, splitFacts } from '../lib/gallery-text';
import './GalleryView.css';

interface GalleryFrameItem extends HeroCarouselItem {
  tag?: string;
}

// 6 Default Editorial Frames (matching v11 reference) if no published items exist
const DEFAULT_FRAMES: GalleryFrameItem[] = [
  {
    id: 'def-1',
    title: 'Opening\nRound',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 1', 'ARENA'],
    tag: 'Round 1',
  },
  {
    id: 'def-2',
    title: 'Bidding\nFloor',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 1', 'LIVE'],
    tag: 'Round 1',
  },
  {
    id: 'def-3',
    title: 'The Hammer\nDrops',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 2', 'HAMMER'],
    tag: 'Round 2',
  },
  {
    id: 'def-4',
    title: 'Team\nHuddle',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'STRATEGY', 'TEAMS'],
    tag: 'Teams',
  },
  {
    id: 'def-5',
    title: 'Podium\nReveal',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'FINAL', 'PODIUM'],
    tag: 'Final',
  },
  {
    id: 'def-6',
    title: 'Certificate\nHandover',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'AWARDS', 'CERTIFICATES'],
    tag: 'Awards',
  },
];

export default function GalleryView() {
  const reducedMotion = useReducedMotion();

  // Controlled Carousel Index
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Gallery items loaded from published gallery_items
  const [galleryItems, setGalleryItems] = useState<GalleryFrameItem[]>(DEFAULT_FRAMES);
  const [activeTag, setActiveTag] = useState<string>('All');

  useEffect(() => {
    document.title = 'Gen Code League | Gallery';

    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) {
        setScrollProgress((window.scrollY / total) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch published gallery items
  useEffect(() => {
    async function fetchGallery() {
      try {
        let rows: any[] | null = null;
        let err: unknown = null;

        // 1. Try querying gallery_items view
        const resItems = await supabase
          .from('gallery_items')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (!resItems.error && resItems.data && resItems.data.length > 0) {
          rows = resItems.data;
        } else {
          // 2. Fallback to gallery_photos table directly
          const resPhotos = await supabase
            .from('gallery_photos')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

          if (!resPhotos.error && resPhotos.data) {
            rows = resPhotos.data;
          } else {
            err = resPhotos.error;
          }
        }

        if (err) {
          console.warn('Failed to load gallery items:', err);
          return;
        }

        if (rows && rows.length > 0) {
          const mapped: GalleryFrameItem[] = rows.map((r, i) => {
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
              tag: r.tag || r.segment || 'General',
            };
          });

          if (mapped.length > 0) {
            setGalleryItems(mapped);
          }
        }
      } catch (e) {
        console.warn('Error fetching gallery items:', e);
      }
    }

    fetchGallery();
  }, []);

  // Filter tags derived from loaded items
  const tags = useMemo(() => {
    const set = new Set<string>();
    galleryItems.forEach((item) => {
      if (item.tag && item.tag.trim()) {
        set.add(item.tag.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [galleryItems]);

  // Filtered tiles
  const filteredTiles = useMemo(() => {
    if (activeTag === 'All') return galleryItems;
    return galleryItems.filter((item) => item.tag === activeTag);
  }, [activeTag, galleryItems]);

  // Tile click handler: smooth-scroll to top and focus item in carousel
  const handleTileClick = (item: GalleryFrameItem) => {
    const targetIdx = galleryItems.findIndex((it) => it.id === item.id);
    if (targetIdx !== -1) {
      setCarouselIndex(targetIdx);
    }
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="gcl-gallery">
      {/* Scroll progress bar */}
      <div id="pg" style={{ width: `${scrollProgress}%` }} />

      {/* Universal Navigation Header */}
      <Header viewMode="live" onToggleView={() => {}} />

      <main>
        {/* ====================================================================
            CAROUSEL SECTION: NATURAL BACKDROP, NO TINT, EDITABLE TEXT PER PHOTO
            ==================================================================== */}
        <section id="gal">
          <div
            className="hc-stage-wrap"
            id="hc1"
            data-slot="gallery_items: photo, title, photo by, description (each editable per photo)"
          >
            <HeroCarousel
              items={galleryItems}
              index={carouselIndex}
              onIndexChange={setCarouselIndex}
              autoplay={!reducedMotion}
              autoplayDelay={4500}
              className="w-full h-full"
            />
          </div>
        </section>

        {/* ====================================================================
            ALL FRAMES (ARCHIVE) SECTION: DARK THEME (.gcl-gallery)
            ==================================================================== */}
        <section className="sec">
          <div className="c">
            <div className="agh">
              <div>
                <div className="k">
                  Archive / <span id="cnt">{filteredTiles.length}</span> frames
                </div>
                <h2 className="st">
                  All <em>frames.</em>
                </h2>
              </div>

              {/* Tag Filter Chips */}
              <div className="chips" id="chips">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`chip ${activeTag === tag ? 'on' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of tiles: 3 columns desktop, 2 mobile, aspect 4:5 */}
            <div className="ag" id="ag">
              {filteredTiles.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="ft rv on"
                  tabIndex={0}
                  role="button"
                  aria-label={item.title ? item.title.replace(/\n/g, ' ') : `Photo ${idx + 1}`}
                  onClick={() => handleTileClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTileClick(item);
                    }
                  }}
                >
                  <div className="im">
                    <SmoothImage
                      src={item.image}
                      alt={item.title ? item.title.replace(/\n/g, ' ') : ''}
                      loading="lazy"
                      wrapperClassName="w-full h-full"
                      className="object-cover"
                    />
                  </div>

                  {/* Title and credit overlay: empty means hidden, never placeholder */}
                  {(item.title || item.credit) && (
                    <div className="ov">
                      {item.title ? <b>{item.title.replace(/\n/g, ' ')}</b> : null}
                      {item.credit ? <small>{item.credit}</small> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Universal Footer */}
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
