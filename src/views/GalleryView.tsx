import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import Header from '../components/Header';
import { HeroCarousel, type HeroCarouselItem } from '../components/ui/hero-carousel';
import { getPublicGalleryItems } from '../services/contentService';
import { supabase } from '../lib/supabase';
import type { GalleryPhoto, Edition } from '../types/database';
import './GalleryView.css';

export default function GalleryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  // All published photos for the top full-bleed HeroCarousel
  const [carouselPhotos, setCarouselPhotos] = useState<GalleryPhoto[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);

  // Editions and Tag list for Filter Chips
  const [editions, setEditions] = useState<Edition[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(searchParams.get('filter') || 'All');

  // Archive Masonry Photos & Pagination
  const [archivePhotos, setArchivePhotos] = useState<GalleryPhoto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingArchive, setLoadingArchive] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Lightbox State
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Carousel Photos & Filter Metadata on Mount
  useEffect(() => {
    document.title = 'Gen Code League | Gallery';

    async function initGallery() {
      try {
        // Fetch published photos for the carousel (all published, ordered by sort_order)
        const { data: allPublished, error } = await supabase
          .from('gallery_photos')
          .select(`
            *,
            edition:editions(id, name, year)
          `)
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('uploaded_at', { ascending: false });

        if (!error && allPublished) {
          const items: GalleryPhoto[] = allPublished.map((p) => ({
            ...p,
            title: p.title || p.caption || 'Event Photograph',
            accent: p.accent || '#8a8a8a',
            credit: p.credit || 'BY GCL MEDIA TEAM.',
            meta: Array.isArray(p.meta) ? p.meta : [],
            tag: p.tag || p.segment || 'General',
          }));

          setCarouselPhotos(items);

          // Extract unique tags
          const tagsSet = new Set<string>();
          items.forEach((item) => {
            if (item.tag && item.tag.trim()) {
              tagsSet.add(item.tag.trim());
            }
          });
          setAvailableTags(Array.from(tagsSet));
        }

        // Fetch editions
        const { data: eds } = await supabase
          .from('editions')
          .select('*')
          .order('year', { ascending: false });

        if (eds) setEditions(eds);
      } catch (err) {
        console.warn('Failed to load gallery items:', err);
      } finally {
        setCarouselLoading(false);
      }
    }

    initGallery();
  }, []);

  // 2. Fetch Archive Items when Active Filter Changes
  const fetchArchive = useCallback(
    async (filterValue: string, pageNum: number, isAppend: boolean = false) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoadingArchive(true);
      }

      try {
        // Determine whether filter matches an edition or a tag
        const matchingEdition = editions.find(
          (e) => e.name.toLowerCase() === filterValue.toLowerCase() || `gcl ${e.year}`.toLowerCase() === filterValue.toLowerCase()
        );

        const params: Parameters<typeof getPublicGalleryItems>[0] = {
          page: pageNum,
          pageSize: 20,
        };

        if (filterValue !== 'All') {
          if (matchingEdition) {
            params.editionId = matchingEdition.id;
          } else {
            params.tag = filterValue;
          }
        }

        const res = await getPublicGalleryItems(params);

        if (isAppend) {
          setArchivePhotos((prev) => [...prev, ...res.items]);
        } else {
          setArchivePhotos(res.items);
        }

        setTotalCount(res.total);
        setHasMore(res.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.warn('Failed to fetch archive items:', err);
      } finally {
        setLoadingArchive(false);
        setLoadingMore(false);
      }
    },
    [editions]
  );

  useEffect(() => {
    fetchArchive(activeFilter, 1, false);
  }, [activeFilter, fetchArchive]);

  // Handle Filter Change
  const handleFilterSelect = (chip: string) => {
    setActiveFilter(chip);
    setSearchParams(chip === 'All' ? {} : { filter: chip });
  };

  // Handle Load More
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchArchive(activeFilter, page + 1, true);
    }
  };

  // Map Carousel Photos to HeroCarouselItems
  const carouselItems: HeroCarouselItem[] = useMemo(() => {
    return carouselPhotos.map((p) => ({
      id: p.id,
      title: (p.title || 'Event Photograph').toUpperCase(),
      image: p.image_url,
      credit: p.credit || 'BY GCL MEDIA TEAM.',
      meta: Array.isArray(p.meta) && p.meta.length > 0 ? p.meta : [p.tag || 'GCL ARCHIVE'],
      accent: p.accent || '#8a8a8a',
    }));
  }, [carouselPhotos]);

  // Lightbox keyboard controls, focus trap, and body lock
  const openLightbox = (index: number, e: React.MouseEvent<HTMLElement>) => {
    triggerElementRef.current = e.currentTarget;
    setActivePhotoIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setActivePhotoIndex(null);
    document.body.style.overflow = '';
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
  }, []);

  const nextLightboxPhoto = useCallback(() => {
    if (activePhotoIndex === null || archivePhotos.length === 0) return;
    setActivePhotoIndex((prev) => (prev! + 1) % archivePhotos.length);
  }, [activePhotoIndex, archivePhotos.length]);

  const prevLightboxPhoto = useCallback(() => {
    if (activePhotoIndex === null || archivePhotos.length === 0) return;
    setActivePhotoIndex((prev) => (prev! - 1 + archivePhotos.length) % archivePhotos.length);
  }, [activePhotoIndex, archivePhotos.length]);

  useEffect(() => {
    if (activePhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextLightboxPhoto();
      } else if (e.key === 'ArrowLeft') {
        prevLightboxPhoto();
      } else if (e.key === 'Tab' && lightboxRef.current) {
        const focusable = lightboxRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, closeLightbox, nextLightboxPhoto, prevLightboxPhoto]);

  // Combined Chips: "All" + Editions + Dynamic Tags
  const filterChips = useMemo(() => {
    const list = ['All'];
    editions.forEach((ed) => {
      if (!list.includes(ed.name)) list.push(ed.name);
    });
    availableTags.forEach((t) => {
      if (!list.includes(t)) list.push(t);
    });
    return list;
  }, [editions, availableTags]);

  const currentLightboxPhoto =
    activePhotoIndex !== null ? archivePhotos[activePhotoIndex] : null;

  return (
    <div className="gcl-gallery-root">
      {/* Universal Navigation Header */}
      <Header viewMode="live" onToggleView={() => {}} />

      <main>
        {/* ====================================================================
            A. FULL-WIDTH HERO CAROUSEL
            Height: calc(100vh - 72px) with min-height 540px
            ==================================================================== */}
        <section className="w-full bg-black relative">
          <div className="w-full h-[calc(100vh-72px)] min-h-[540px]">
            {carouselLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-black text-[#5a5a66] font-mono text-sm">
                <Loader2 size={24} className="animate-spin text-[#ff2a3d] mr-3" />
                Loading gallery...
              </div>
            ) : carouselItems.length > 0 ? (
              <HeroCarousel
                items={carouselItems}
                autoplay={false}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#5a5a66] font-mono text-sm">
                <ImageIcon size={40} className="mb-3 opacity-40" />
                No photos yet
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            B. THE FULL ARCHIVE SECTION
            ==================================================================== */}
        <section className="gallery-shell py-16 sm:py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
            <div>
              <div className="mb-2">
                <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-[#8e8e99]">
                  All photos / {totalCount} photos
                </span>
              </div>
              <h2 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase tracking-[-0.02em] text-[clamp(36px,5.5vw,68px)] leading-[0.92]">
                The full <span className="text-[#ff2a3d]">archive.</span>
              </h2>
            </div>

            {/* Filter Chips on Right */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 max-w-full">
              {filterChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleFilterSelect(chip)}
                  className={`gallery-filter-chip ${activeFilter === chip ? 'active' : ''}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* ====================================================================
              C. MASONRY GRID (CSS Columns)
              ==================================================================== */}
          {loadingArchive ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#5a5a66] font-mono text-sm">
              <Loader2 size={24} className="animate-spin text-[#ff2a3d] mb-3" />
              Loading archive photos...
            </div>
          ) : archivePhotos.length === 0 ? (
            <div className="py-24 text-center border border-[#26262b] bg-[#131316] p-8">
              <ImageIcon size={44} className="mx-auto mb-4 text-[#5a5a66]" />
              <h3 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-2xl text-[#f4f4f6] mb-2">
                No Photos Found
              </h3>
              <p className="font-mono text-xs text-[#8e8e99] uppercase tracking-wider">
                No published photos match the &quot;{activeFilter}&quot; filter.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="gallery-masonry-grid"
              >
                {archivePhotos.map((photo, index) => {
                  const titleFormatted = (photo.title || 'Event Highlight').replace(/\n/g, ' ');

                  return (
                    <motion.div
                      key={photo.id || index}
                      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ duration: 0.45, delay: Math.min((index % 6) * 0.06, 0.3) }}
                      className="gallery-masonry-item"
                    >
                      <div
                        className="gallery-card-inner group"
                        tabIndex={0}
                        role="button"
                        aria-label={`Open photo: ${titleFormatted}`}
                        onClick={(e) => openLightbox(index, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openLightbox(index, e as unknown as React.MouseEvent<HTMLElement>);
                          }
                        }}
                      >
                        <div className="relative w-full overflow-hidden bg-[#18181c]">
                          <img
                            src={photo.image_url}
                            alt={titleFormatted}
                            loading="lazy"
                            className="w-full h-auto block object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>

                        {/* Caption Row in Mono */}
                        <div className="p-3 bg-[#131316] border-t border-[#26262b] flex items-center justify-between gap-3">
                          <span className="font-mono text-xs uppercase tracking-wider text-[#e8e8ed] truncate">
                            {titleFormatted}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-wider text-[#8e8e99] shrink-0">
                            {photo.tag || 'Moment'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Pagination: Load More Outlined Button */}
          {hasMore && !loadingArchive && (
            <div className="flex justify-center mt-12 sm:mt-16">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="border border-[#3a3a42] hover:border-[#ff2a3d] text-[#f4f4f6] hover:text-[#ff2a3d] font-mono text-xs uppercase px-8 py-3 tracking-widest transition-all inline-flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#ff2a3d]" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ====================================================================
          D. LIGHTBOX MODAL
          ==================================================================== */}
      {currentLightboxPhoto && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo Lightbox"
          className="gallery-lightbox-overlay"
          onClick={closeLightbox}
        >
          {/* Close Button Top Right */}
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close photo preview"
            className="absolute top-5 right-5 sm:top-8 sm:right-8 z-50 text-white/80 hover:text-white p-2 bg-black/40 hover:bg-black/80 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          {/* Prev Button */}
          {archivePhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevLightboxPhoto();
              }}
              aria-label="Previous photo"
              className="absolute left-3 sm:left-6 z-50 text-white/80 hover:text-white p-3 bg-black/40 hover:bg-black/80 rounded-full transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Next Button */}
          {archivePhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextLightboxPhoto();
              }}
              aria-label="Next photo"
              className="absolute right-3 sm:right-6 z-50 text-white/80 hover:text-white p-3 bg-black/40 hover:bg-black/80 rounded-full transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Lightbox Content Container */}
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-[75vh] w-auto overflow-hidden bg-black/40 flex items-center justify-center">
              <img
                src={currentLightboxPhoto.image_url}
                alt={currentLightboxPhoto.title || 'Event Photo'}
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain"
              />
            </div>

            {/* Captions and Meta info below image */}
            <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 text-left">
              <div>
                <h3 className="font-['Barlow_Semi_Condensed',sans-serif] font-bold uppercase text-xl sm:text-2xl text-white tracking-tight">
                  {(currentLightboxPhoto.title || 'Event Highlight').replace(/\n/g, ' ')}
                </h3>
                {currentLightboxPhoto.credit && (
                  <p className="font-mono text-xs uppercase tracking-widest text-[#8e8e99] mt-1">
                    {currentLightboxPhoto.credit}
                  </p>
                )}
              </div>

              {currentLightboxPhoto.meta && currentLightboxPhoto.meta.length > 0 && (
                <div className="flex items-center gap-3">
                  {currentLightboxPhoto.meta.map((m, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs uppercase tracking-wider text-[#8e8e99] px-2.5 py-1 bg-white/5 border border-white/10"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
