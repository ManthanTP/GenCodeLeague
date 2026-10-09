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

// Cached gallery items helper to prevent any initial layout shift or empty flashes
const getInitialGalleryItems = (): GalleryFrameItem[] => {
  try {
    const cached = localStorage.getItem('gcl_gallery_items_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
};

export default function GalleryView() {
  const reducedMotion = useReducedMotion();

  // Controlled Carousel Index
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Gallery items loaded from published gallery_items or local cache
  const [galleryItems, setGalleryItems] = useState<GalleryFrameItem[]>(getInitialGalleryItems);
  const [activeTag, setActiveTag] = useState<string>('All');

  // Lightbox Modal state for full image viewer
  const [selectedImage, setSelectedImage] = useState<GalleryFrameItem | null>(null);

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
            try {
              localStorage.setItem('gcl_gallery_items_cache', JSON.stringify(mapped));
            } catch (e) {}
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

  // Lightbox keyboard navigation (Esc to close, ArrowLeft / ArrowRight to navigate)
  useEffect(() => {
    if (!selectedImage) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      } else if (e.key === 'ArrowLeft') {
        const curIdx = filteredTiles.findIndex((t) => t.id === selectedImage.id);
        if (curIdx > 0) {
          setSelectedImage(filteredTiles[curIdx - 1]);
        } else if (curIdx === 0 && filteredTiles.length > 1) {
          setSelectedImage(filteredTiles[filteredTiles.length - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = filteredTiles.findIndex((t) => t.id === selectedImage.id);
        if (curIdx !== -1 && curIdx < filteredTiles.length - 1) {
          setSelectedImage(filteredTiles[curIdx + 1]);
        } else if (curIdx === filteredTiles.length - 1 && filteredTiles.length > 1) {
          setSelectedImage(filteredTiles[0]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedImage, filteredTiles]);

  const selectedIndex = selectedImage
    ? filteredTiles.findIndex((t) => t.id === selectedImage.id)
    : -1;

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex > 0) {
      setSelectedImage(filteredTiles[selectedIndex - 1]);
    } else if (filteredTiles.length > 1) {
      setSelectedImage(filteredTiles[filteredTiles.length - 1]);
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex !== -1 && selectedIndex < filteredTiles.length - 1) {
      setSelectedImage(filteredTiles[selectedIndex + 1]);
    } else if (filteredTiles.length > 1) {
      setSelectedImage(filteredTiles[0]);
    }
  };

  // Tile click handler: opens the full image viewer without scrolling to top
  const handleTileClick = (item: GalleryFrameItem) => {
    setSelectedImage(item);
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
            {galleryItems.length > 0 ? (
              <HeroCarousel
                items={galleryItems}
                index={carouselIndex}
                onIndexChange={setCarouselIndex}
                autoplay={!reducedMotion}
                autoplayDelay={4500}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-[#07070a] relative">
                <SmoothImage
                  src={null}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full"
                />
              </div>
            )}
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

            {/* Grid of tiles: responsive spacious grid */}
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

                  {/* Title and credit overlay */}
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

        {/* ====================================================================
            VIEW IMAGE TYPE LIGHTBOX MODAL
            ==================================================================== */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-2xl animate-fade-in"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image view"
          >
            <div
              className="relative max-w-5xl w-full max-h-[94vh] flex flex-col items-center justify-center text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar: Tag Badge, Frame Index, Close Button */}
              <div className="w-full flex items-center justify-between pb-3 text-white">
                <div className="flex items-center gap-3">
                  {selectedImage.tag && (
                    <span className="px-3 py-1 rounded-full bg-[#2a0c12] border border-[#ff2a3d] text-[#ff8791] font-mono text-xs font-semibold uppercase tracking-wider">
                      {selectedImage.tag}
                    </span>
                  )}
                  <span className="text-xs font-mono text-[#8e8e9a] uppercase tracking-wider">
                    {selectedIndex !== -1 ? `FRAME ${selectedIndex + 1} OF ${filteredTiles.length}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="text-[#8e8e9a] hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                  aria-label="Close image viewer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Main Image Stage with Previous and Next Controls */}
              <div className="relative w-full flex items-center justify-center my-auto overflow-hidden rounded-2xl border border-[#24242c] bg-[#0c0c11] shadow-[0_0_80px_rgba(255,42,61,0.25)]">
                {filteredTiles.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 sm:left-5 z-10 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 cursor-pointer shadow-lg"
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                <img
                  src={selectedImage.image}
                  alt={selectedImage.title?.replace(/\n/g, ' ') || 'Gallery frame'}
                  className="max-h-[72vh] sm:max-h-[76vh] w-auto max-w-full object-contain select-none"
                />

                {filteredTiles.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 sm:right-5 z-10 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 cursor-pointer shadow-lg"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Caption, Credits and Description Facts */}
              {(selectedImage.title || selectedImage.credit || (selectedImage.meta && selectedImage.meta.length > 0)) && (
                <div className="w-full mt-3 flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-[#8e8e9a]">
                  <div>
                    {selectedImage.title && (
                      <span className="text-white text-base sm:text-lg font-bold font-['Barlow_Semi_Condensed',sans-serif] uppercase tracking-wide mr-3">
                        {selectedImage.title.replace(/\n/g, ' ')}
                      </span>
                    )}
                    {selectedImage.credit && <span>{selectedImage.credit}</span>}
                  </div>
                  {selectedImage.meta && selectedImage.meta.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedImage.meta.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
