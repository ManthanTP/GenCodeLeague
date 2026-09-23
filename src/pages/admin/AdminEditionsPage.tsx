import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Edition, EditionStatus, RegistrationStatus } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminEditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [name, setName] = useState(`Gen Code League ${new Date().getFullYear() + 1}`);
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('Main Auditorium & Digital Arena');
  const [eventDate, setEventDate] = useState('2027-10-15');
  const [status, setStatus] = useState<EditionStatus>('draft');
  const [regStatus, setRegStatus] = useState<RegistrationStatus>('not_open');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadEditions();
  }, []);

  async function loadEditions() {
    setLoading(true);
    const { data } = await supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false });

    if (data) setEditions(data as Edition[]);
    setLoading(false);
  }

  async function handleSetCurrent(id: string) {
    // Unset all, then set this one
    await supabase.from('editions').update({ is_current: false }).neq('id', id);
    await supabase.from('editions').update({ is_current: true }).eq('id', id);
    await loadEditions();
  }

  async function handleCreateEdition(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (isCurrent) {
        // unset other current
        await supabase.from('editions').update({ is_current: false }).neq('year', 0);
      }

      const { error } = await supabase.from('editions').insert({
        year,
        name,
        description,
        venue,
        event_date: eventDate,
        status,
        registration_status: regStatus,
        is_current: isCurrent,
      });

      if (error) throw error;

      setIsModalOpen(false);
      await loadEditions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create edition.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading league seasons..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>League Seasons / Editions</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Permanent architecture: Create and manage discrete tournament seasons without codebase alteration.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Create New Season
        </Button>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Season Name</th>
              <th>Event Status</th>
              <th>Registration</th>
              <th>Date & Venue</th>
              <th>Current Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {editions.map((ed) => (
              <tr key={ed.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                  {ed.year}
                </td>
                <td style={{ fontWeight: 600 }}>{ed.name}</td>
                <td>
                  <Badge variant={ed.status === 'live' ? 'live' : 'subtle'} pulse={ed.status === 'live'}>
                    {ed.status.toUpperCase()}
                  </Badge>
                </td>
                <td>
                  <Badge variant={ed.registration_status === 'open' ? 'qualified' : 'subtle'}>
                    {ed.registration_status.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <div>{ed.event_date || 'Date TBA'}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{ed.venue || 'Venue TBA'}</div>
                </td>
                <td>
                  {ed.is_current ? (
                    <Badge variant="primary">★ CURRENT SEASON</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleSetCurrent(ed.id)}>
                      Set as Active
                    </Button>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Managed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize New Season">
        <form onSubmit={handleCreateEdition} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-input"
                required
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Official Title</label>
              <input
                type="text"
                className="form-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Season Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Season overview and format description..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Competition Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as EditionStatus)}
              >
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="pre_event">Pre-Event</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Registration Phase</label>
              <select
                className="form-select"
                value={regStatus}
                onChange={(e) => setRegStatus(e.target.value as RegistrationStatus)}
              >
                <option value="not_open">Not Open</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Event Date</label>
              <input
                type="date"
                className="form-input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Venue</label>
              <input
                type="text"
                className="form-input"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
            />
            <span>Set as Current Active League Season immediately</span>
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Initialize Season
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
