"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Header from '../components/Header';
import {
  HeroCarousel,
  type HeroCarouselItem,
} from '../components/ui/hero-carousel';
import { supabase } from '../lib/supabase';
import './GalleryView.css';

// 6 Default Editorial Placeholder Frames (used if no published items exist)
const PLACEHOLDER_FRAMES: (HeroCarouselItem & { tag: string })[] = [
  {
    id: 'ph-1',
    title: 'Frame 01',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 1', 'ARENA'],
    tag: 'Round 1',
  },
  {
    id: 'ph-2',
    title: 'Frame 02',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 1', 'LIVE'],
    tag: 'Round 1',
  },
  {
    id: 'ph-3',
    title: 'Frame 03',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'ROUND 2', 'HAMMER'],
    tag: 'Round 2',
  },
  {
    id: 'ph-4',
    title: 'Frame 04',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'STRATEGY', 'TEAMS'],
    tag: 'Teams',
  },
  {
    id: 'ph-5',
    title: 'Frame 05',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'FINAL', 'PODIUM'],
    tag: 'Final',
  },
  {
    id: 'ph-6',
    title: 'Frame 06',
    image: '',
    credit: 'BY GCL MEDIA TEAM.',
    meta: ['GCL 2025', 'AWARDS', 'CERTIFICATES'],
    tag: 'Awards',
  },
];

const looksLikeFileName = (t: string) => {
  const s = (t || '').trim();
  return (
    !s ||
    /\.(jpe?g|png|webp|avif|gif|heic)$/i.test(s) ||
    /^(IMG|DSC|PXL|DCIM|WA|SCREENSHOT)[\s_-]?\d/i.test(s) ||
    /\d{8,}/.test(s)
  );
};

export default function GalleryView() {
  const reducedMotion = useReducedMotion();

  // Controlled Carousel Index
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Gallery items loaded from published gallery_items
  const [galleryItems, setGalleryItems] = useState<(HeroCarouselItem & { tag?: string })[]>(PLACEHOLDER_FRAMES);
  const [activeTag, setActiveTag] = useState<string>('All');

  // Fetch published gallery items
  useEffect(() => {
    document.title = 'Gen Code League | Gallery';

    async function fetchGallery() {
      try {
        // Query published items from gallery_items view (or gallery_photos table fallback)
        let data: Record<string, unknown>[] | null = null;
        let err: unknown = null;

        const resItems = await supabase
          .from('gallery_items')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (!resItems.error && resItems.data && resItems.data.length > 0) {
          data = resItems.data as Record<string, unknown>[];
        } else {
          // Fallback query to gallery_photos table directly
          const resPhotos = await supabase
            .from('gallery_photos')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

          if (!resPhotos.error && resPhotos.data) {
            data = resPhotos.data as Record<string, unknown>[];
          } else {
            err = resPhotos.error;
          }
        }

        if (err) {
          console.warn('Failed to load gallery items:', err);
          return;
        }

        if (data && data.length > 0) {
          const mapped: (HeroCarouselItem & { tag?: string })[] = data.map((p, i) => {
            const rawAccent = (p.accent as string)?.trim();
            // Pass accent as undefined when the item has none; do not invent a colour in the page.
            const accent =
              !rawAccent || rawAccent.toLowerCase() === '#8a8a8a' ? undefined : rawAccent;

            const title = (p.title as string) || (p.caption as string) || '';
            const image = ((p.photo_url as string) || (p.image_url as string) || '').trim();
            const meta =
              Array.isArray(p.meta) && p.meta.length > 0
                ? (p.meta as string[])
                : [((p.tag as string) || (p.segment as string) || 'GENERAL').toUpperCase()];
            const credit = (p.credit as string) || 'BY GCL MEDIA TEAM.';
            const tag = (p.tag as string) || (p.segment as string) || 'General';

            return {
              id: (p.id as string | number) ?? i,
              title,
              image,
              credit,
              meta,
              accent,
              tag,
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

  // Filtered tiles for the ivory grid
  const filteredTiles = useMemo(() => {
    if (activeTag === 'All') return galleryItems;
    return galleryItems.filter((item) => item.tag === activeTag);
  }, [activeTag, galleryItems]);

  // Tile click handler: smooth-scroll to top and focus item in carousel
  const handleTileClick = (item: HeroCarouselItem) => {
    const targetIdx = galleryItems.findIndex((it) => it.id === item.id);
    if (targetIdx !== -1) {
      setCarouselIndex(targetIdx);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTileFallbackSrc = (accent?: string) => {
    const safeAccent = accent || '#e8743b';
    return `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${safeAccent}'/><stop offset='1' stop-color='#110b0d'/></linearGradient></defs><rect width='300' height='400' fill='url(#g)'/></svg>`
    )}`;
  };

  return (
    <div className="gallery-page-root">
      {/* Universal Navigation Header */}
      <Header viewMode="live" onToggleView={() => {}} />

      <main>
        {/* ====================================================================
            TOP: HERO CAROUSEL in explicit sized wrapper
            Height: min(88vh, 860px); min-height: 540px
            ==================================================================== */}
        <section
          className="gallery-carousel-wrapper"
          style={{ height: 'min(88vh, 860px)', minHeight: '540px' }}
        >
          <HeroCarousel
            items={galleryItems}
            index={carouselIndex}
            onIndexChange={setCarouselIndex}
            autoplay={!reducedMotion}
            autoplayDelay={4500}
            className="w-full h-full"
          />
        </section>

        {/* ====================================================================
            BELOW: IVORY SECTION (#f3efe6, ink text) "All frames"
            ==================================================================== */}
        <section className="gallery-ivory-section">
          <div className="gallery-ivory-container">
            {/* Section Header with Filter Chips */}
            <div className="gallery-ivory-header">
              <div>
                <div className="gallery-ivory-eyebrow">
                  Archive / {galleryItems.length} frames
                </div>
                <h2 className="gallery-ivory-title">
                  All frames.
                </h2>
              </div>

              {/* Tag Filter Chips */}
              <div className="gallery-chip-group">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`gallery-tag-chip ${activeTag === tag ? 'active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of tiles: 3 columns desktop, 2 mobile, aspect 4:5 */}
            <div className="gallery-frames-grid">
              {filteredTiles.map((item, idx) => {
                const titleClean = looksLikeFileName(item.title)
                  ? `Frame ${String(idx + 1).padStart(2, '0')}`
                  : item.title.replace(/\n/g, ' ');

                const tileImgSrc = item.image || getTileFallbackSrc(item.accent);

                return (
                  <motion.div
                    key={item.id ?? idx}
                    initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min((idx % 3) * 0.08, 0.24),
                    }}
                    className="gallery-frame-tile"
                    tabIndex={0}
                    role="button"
                    aria-label={`View photo: ${titleClean}`}
                    onClick={() => handleTileClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTileClick(item);
                      }
                    }}
                  >
                    <img
                      src={tileImgSrc}
                      alt={titleClean}
                      loading="lazy"
                      className="gallery-frame-img"
                      onError={(e) => {
                        const fb = getTileFallbackSrc(item.accent);
                        if (e.currentTarget.src !== fb) {
                          e.currentTarget.src = fb;
                        }
                      }}
                    />

                    {/* Title and credit overlay at bottom */}
                    <div className="gallery-frame-overlay">
                      <h3 className="gallery-frame-title">
                        {titleClean}
                      </h3>
                      {item.credit ? (
                        <p className="gallery-frame-credit">
                          {item.credit}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
