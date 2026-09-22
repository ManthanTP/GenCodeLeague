import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminSettingsPage() {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [regStatus, setRegStatus] = useState<string>('open');
  const [startingBudget, setStartingBudget] = useState(10000);
  const [bidIncrement, setBidIncrement] = useState(100);
  const [templateVersion, setTemplateVersion] = useState('GCL-V1');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
      if (edData) {
        setEdition(edData as Edition);
        setRegStatus(edData.registration_status);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    setSaving(true);
    setMsg(null);

    try {
      await supabase.from('editions').update({
        registration_status: regStatus as any,
      }).eq('id', edition.id);

      setMsg('Settings updated successfully.');
    } catch (err: any) {
      setMsg(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading settings..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '720px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Platform Governance Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configure global tournament parameters for {edition?.name || 'GCL 2026'}.
        </p>
      </div>

      {msg && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-qualified-bg)', border: '1px solid var(--status-qualified-border)', color: 'var(--status-qualified)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="gcl-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          Registration Window
        </h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Squad Registration State</label>
          <select className="form-select" value={regStatus} onChange={(e) => setRegStatus(e.target.value)}>
            <option value="open">Open (Accepting Delegate Registrations)</option>
            <option value="closed">Closed (Rosters Locked)</option>
            <option value="waitlist">Waitlist (Queueing)</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginTop: '1rem' }}>
          Auction Engine Defaults
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Starting Squad Budget ($)</label>
            <input
              type="number"
              className="form-input"
              value={startingBudget}
              onChange={(e) => setStartingBudget(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Minimum Bid Increment ($)</label>
            <input
              type="number"
              className="form-input"
              value={bidIncrement}
              onChange={(e) => setBidIncrement(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginTop: '1rem' }}>
          Credential Architecture
        </h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Active Certificate Template Version</label>
          <input
            type="text"
            className="form-input"
            value={templateVersion}
            onChange={(e) => setTemplateVersion(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" isLoading={saving} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
          Save Platform Parameters
        </Button>
      </form>
    </div>
  );
}
