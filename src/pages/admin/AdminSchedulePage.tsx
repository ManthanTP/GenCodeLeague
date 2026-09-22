import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Schedule, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [sortOrder, setSortOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('edition_id', edData.id)
        .order('sort_order', { ascending: true });
      if (data) setSchedules(data as Schedule[]);
    }
    setLoading(false);
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !title.trim()) return;

    setSaving(true);
    try {
      await supabase.from('schedules').insert({
        edition_id: currentEdition.id,
        title: title.trim(),
        description: description.trim(),
        start_time: startTime,
        end_time: endTime,
        sort_order: sortOrder,
        status: 'upcoming',
      });

      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      await loadSchedule();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading schedule..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Schedule & Timeline Editor</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure event day milestones, briefing times, and round schedules.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Add Schedule Event
        </Button>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Time Window</th>
              <th>Event Title</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>#{s.sort_order}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {s.start_time} - {s.end_time}
                </td>
                <td style={{ fontWeight: 600 }}>{s.title}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.description}</td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.from('schedules').delete().eq('id', s.id);
                      await loadSchedule();
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Schedule Item">
        <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Event Milestone Title</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Delegate Check-In & Environment Inspection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Time</label>
              <input type="text" className="form-input" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Time</label>
              <input type="text" className="form-input" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sequence</label>
              <input type="number" className="form-input" required value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10))} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions for teams..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
