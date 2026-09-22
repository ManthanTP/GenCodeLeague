import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Organizer, Edition } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Technical Adjudicator');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizers();
  }, []);

  async function loadOrganizers() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);
      const { data } = await supabase
        .from('organizers')
        .select('*')
        .eq('edition_id', edData.id)
        .order('sort_order', { ascending: true });
      if (data) setOrganizers(data as Organizer[]);
    }
    setLoading(false);
  }

  async function handleAddOrganizer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !name.trim()) return;

    setSaving(true);
    try {
      await supabase.from('organizers').insert({
        edition_id: currentEdition.id,
        name: name.trim(),
        role: role.trim(),
        sort_order: organizers.length + 1,
      });

      setIsModalOpen(false);
      setName('');
      await loadOrganizers();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading organizers..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Organizing Committee Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Designate official patrons, technical directors, and tournament adjudicators.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Add Committee Official
        </Button>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Official Name</th>
              <th>Designation</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map((org) => (
              <tr key={org.id}>
                <td style={{ fontWeight: 600 }}>{org.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{org.role}</td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.from('organizers').delete().eq('id', org.id);
                      await loadOrganizers();
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Committee Official">
        <form onSubmit={handleAddOrganizer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Dr. Maya Raman"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role Designation</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Chief Technical Adjudicator / Head of Problem Setting"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Add Official
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
