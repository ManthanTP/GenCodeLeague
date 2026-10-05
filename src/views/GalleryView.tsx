import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Image,
  ChevronLeft,
  Filter,
  X,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import type { GalleryPhoto, Edition } from '../types/database';

const SEGMENTS = [
  'All Segments',
  'Opening Ceremony',
  'Round 1',
  'Round 2',
  'Round 3',
  'Live Auction',
  'Finale',
  'Winner Ceremony',
];

export default function GalleryView() {
  const [searchParams] = useSearchParams();
  const initialEditionId = searchParams.get('edition') || 'all';

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(initialEditionId);
  const [selectedSegment, setSelectedSegment] = useState<string>('All Segments');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    // 1. Fetch editions
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) setEditions(data);
      });

    // 2. Fetch all gallery photos
    async function loadPhotos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gallery_photos')
          .select(`
            *,
            edition:editions(id, name, year)
          `)
          .order('uploaded_at', { ascending: false });

        if (!error && data) {
          setPhotos(data as unknown as GalleryPhoto[]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPhotos();
  }, []);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchesEdition =
        selectedEditionId === 'all' || p.edition_id === selectedEditionId;
      const matchesSegment =
        selectedSegment === 'All Segments' ||
        p.segment.toLowerCase() === selectedSegment.toLowerCase();
      return matchesEdition && matchesSegment;
    });
  }, [photos, selectedEditionId, selectedSegment]);

  return (
    <div className="gcl-live-page min-h-screen text-white font-sans selection:bg-red-500 selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="page-shell space-y-6">
        {/* Hero Section */}
        <div className="gcl-card gcl-card--hero mb-[22px]">
          <div className="flex flex-col items-center">
            <div className="gcl-hero-pill">
              <span className="gcl-hero-dot" />
              <span>EVENT MEDIA GALLERY</span>
            </div>
            <h1 className="gcl-hero-title">
              GCL In Action
            </h1>
            <p className="gcl-hero-desc">
              Capturing the intensity, auction battles, keynote highlights, and crowning ceremonies of the GenCode League.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="gcl-card flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Filter size={14} /> Filter:
            </div>

            <select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="gcl-input py-1.5 text-xs font-mono"
            >
              <option value="all">All Editions</option>
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} ({ed.year})
                </option>
              ))}
            </select>

            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="gcl-input py-1.5 text-xs font-mono"
            >
              {SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {filteredPhotos.length} photo(s)
          </span>
        </div>

        {/* Photos Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono">Loading media gallery...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="gcl-card py-20 text-center p-8">
            <Image size={48} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Photos Uploaded</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No photos have been tagged for this filter selection yet. Event photos can be added from the Admin Console.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className="gcl-card gcl-card--interactive !p-0 group relative aspect-[4/3] cursor-pointer"
              >
                <img
                  src={photo.image_url}
                  alt={photo.caption || 'GCL Event Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">
                    {photo.segment} • {photo.edition?.name || 'GCL'}
                  </span>
                  {photo.caption && (
                    <p className="text-xs font-semibold text-white mt-0.5 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              className="max-w-4xl w-full gcl-card space-y-4 !p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
                  {lightboxPhoto.segment} • {lightboxPhoto.edition?.name || 'GenCode League'}
                </span>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#26262b] text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
                <img
                  src={lightboxPhoto.image_url}
                  alt={lightboxPhoto.caption || 'Event Preview'}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>

              {lightboxPhoto.caption && (
                <p className="text-sm text-slate-300 px-2 font-medium">
                  {lightboxPhoto.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
