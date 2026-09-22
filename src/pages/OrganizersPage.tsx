import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Organizer } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function OrganizersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizers() {
      const { data } = await supabase
        .from('organizers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data) setOrganizers(data as Organizer[]);
      setLoading(false);
    }
    loadOrganizers();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="subtle">GOVERNANCE & ADJUDICATION</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Organizing Committee</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
          The tournament leadership, technical problem curators, and adjudicators responsible for the competitive integrity of Gen Code League.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading committee leadership..." />
      ) : organizers.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {organizers.map((org) => (
            <div key={org.id} className="gcl-card">
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--gold)',
                  marginBottom: '1rem',
                }}
              >
                {org.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{org.name}</h3>
              <p style={{ color: 'var(--gold)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {org.role}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-default)' }}>
          <Badge variant="subtle">DRAFT &bull; ORGANIZER REVIEW REQUIRED</Badge>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Official faculty patrons and technical steering committee listings are being curated under administrative governance.
          </p>
        </div>
      )}
    </div>
  );
}
