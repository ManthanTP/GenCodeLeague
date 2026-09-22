import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { GalleryItem } from '../types/database';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGallery() {
      const { data } = await supabase
        .from('gallery')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data) setItems(data as GalleryItem[]);
      setLoading(false);
    }
    loadGallery();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Tournament Gallery</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Visual documentation of tournament environments, live auctions, intense sprint sessions, and podium presentations.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading tournament media..." />
      ) : items.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {items.map((item) => (
            <div key={item.id} className="gcl-card" style={{ padding: '0', overflow: 'hidden' }}>
              <img
                src={item.image_url}
                alt={item.caption || 'GCL Moment'}
                loading="lazy"
                style={{ width: '100%', height: '220px', objectFit: 'cover' }}
              />
              <div style={{ padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {item.caption || 'Tournament Session'}
                </p>
                {item.category && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Official tournament photography is captured during active stages and published immediately following post-production review.
          </p>
        </div>
      )}
    </div>
  );
}
