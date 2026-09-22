import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Round, RoundType, RoundStatus, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminRoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RoundType>('quiz');
  const [duration, setDuration] = useState(45);
  const [sortOrder, setSortOrder] = useState(1);
  const [status, setStatus] = useState<RoundStatus>('upcoming');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: edData } = await supabase.from('editions').select('*').order('year', { ascending: false });
      if (edData && edData.length > 0) {
        setEditions(edData as Edition[]);
        const cur = edData.find((e) => e.is_current) || edData[0];
        setSelectedEdition(cur.id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedEdition) return;
    loadRounds();
  }, [selectedEdition]);

  async function loadRounds() {
    setLoading(true);
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('edition_id', selectedEdition)
      .order('sort_order', { ascending: true });

    if (data) setRounds(data as Round[]);
    setLoading(false);
  }

  async function handleCreateRound(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEdition || !name.trim()) return;

    setSaving(true);
    try {
      await supabase.from('rounds').insert({
        edition_id: selectedEdition,
        name,
        description,
        type,
        duration_minutes: duration,
        sort_order: sortOrder,
        status,
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      await loadRounds();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(roundId: string, newStatus: RoundStatus) {
    await supabase.from('rounds').update({ status: newStatus }).eq('id', roundId);
    await loadRounds();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Tournament Rounds Engine</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure stages, durations, and live status states.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
              </option>
            ))}
          </select>

          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + Add Stage
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading rounds..." />
      ) : (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Round Name</th>
                <th>Format Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Live Status Control</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                    #{r.sort_order}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description}</div>
                  </td>
                  <td>
                    <Badge variant="subtle">{r.type.toUpperCase()}</Badge>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.duration_minutes}m</td>
                  <td>
                    <Badge variant={r.status === 'live' ? 'live' : r.status === 'completed' ? 'subtle' : 'gold'} pulse={r.status === 'live'}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(r.id, 'live')}>
                        Go Live
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(r.id, 'completed')}>
                        Finish
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleUpdateStatus(r.id, 'locked')}>
                        Lock
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Round Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configure New Competition Round">
        <form onSubmit={handleCreateRound} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Round Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Stage 1: Algorithmic Quiz"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Round Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value as RoundType)}>
                <option value="quiz">Quiz (Multiple Choice)</option>
                <option value="coding">Coding Challenge</option>
                <option value="auction">Team Auction</option>
                <option value="special">Special Challenge</option>
                <option value="final">Championship Final</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                className="form-input"
                required
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description & Rules</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stage description, scoring rubric, and qualification parameters..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Add Round
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
