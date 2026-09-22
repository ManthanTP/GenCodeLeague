import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Announcement, Edition, AnnouncementStatus } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<AnnouncementStatus>('published');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .eq('edition_id', edData.id)
        .order('created_at', { ascending: false });

      if (annData) setAnnouncements(annData as Announcement[]);
    }
    setLoading(false);
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !title.trim()) return;

    setSaving(true);
    try {
      await supabase.from('announcements').insert({
        edition_id: currentEdition.id,
        title: title.trim(),
        content: content.trim(),
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      });

      setIsModalOpen(false);
      setTitle('');
      setContent('');
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading announcements..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>League Announcements Broadcast</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Publish directives, round announcements, and schedule updates to participants and spectators.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + New Announcement
        </Button>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Directive Title</th>
              <th>Status</th>
              <th>Published Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((ann) => (
              <tr key={ann.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{ann.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ann.content}
                  </div>
                </td>
                <td>
                  <Badge variant={ann.status === 'published' ? 'live' : 'subtle'}>
                    {ann.status.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                  {new Date(ann.created_at).toLocaleDateString()}
                </td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.from('announcements').delete().eq('id', ann.id);
                      await loadData();
                    }}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Tournament Directive">
        <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Headline / Title</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Stage 1 Quiz Commences at 10:00 AM"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Directive Content</label>
            <textarea
              className="form-textarea"
              required
              rows={4}
              placeholder="Full directive instructions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="published">Publish Immediately</option>
              <option value="draft">Save as Draft</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Broadcast Directive
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
