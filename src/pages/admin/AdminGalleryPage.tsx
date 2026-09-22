import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { GalleryItem, Edition } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Competition Arena');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);
      const { data } = await supabase
        .from('gallery')
        .select('*')
        .eq('edition_id', edData.id)
        .order('sort_order', { ascending: true });
      if (data) setItems(data as GalleryItem[]);
    }
    setLoading(false);
  }

  async function handleAddPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !imageUrl.trim()) return;

    setSaving(true);
    try {
      await supabase.from('gallery').insert({
        edition_id: currentEdition.id,
        image_url: imageUrl.trim(),
        caption: caption.trim(),
        category: category.trim(),
        sort_order: items.length + 1,
      });

      setIsModalOpen(false);
      setImageUrl('');
      setCaption('');
      await loadGallery();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading media items..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Tournament Media Gallery</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Curate event photography and documentary visuals for the public gallery.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Add Media Asset
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {items.map((item) => (
          <div key={item.id} className="gcl-card" style={{ padding: 0, overflow: 'hidden' }}>
            <img src={item.image_url} alt={item.caption || 'GCL'} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.caption || 'Media item'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{item.category}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.from('gallery').delete().eq('id', item.id);
                  await loadGallery();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Tournament Photo">
        <form onSubmit={handleAddPhoto} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Image URL</label>
            <input
              type="url"
              className="form-input"
              required
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Competition Arena</option>
              <option>Live Auction</option>
              <option>Engineering Sprint</option>
              <option>Ceremony & Trophies</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Caption / Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Captains executing tactical bids during Stage 2"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Add Media
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
