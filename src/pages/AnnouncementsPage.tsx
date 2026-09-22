import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement, Edition } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AnnWithEdition extends Announcement {
  editions?: Edition;
}

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnWithEdition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      const { data } = await supabase
        .from('announcements')
        .select(`
          *,
          editions:edition_id (*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (data) setAnnouncements(data as AnnWithEdition[]);
      setLoading(false);
    }
    loadAnnouncements();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '860px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="live" pulse>LEAGUE WIRE</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Announcements & Updates</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Official tournament directives, schedule updates, stage announcements, and administrative circulars.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading official updates..." />
      ) : announcements.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {announcements.map((ann) => (
            <div key={ann.id} className="gcl-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <Badge variant="live">OFFICIAL DIRECTIVE</Badge>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(ann.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h2 style={{ fontSize: '1.375rem', marginBottom: '0.75rem' }}>{ann.title}</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem', whiteSpace: 'pre-line' }}>
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>GCL 2026 Directives Incoming</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Directives for squad registration and platform credentials will broadcast here.
          </p>
        </div>
      )}
    </div>
  );
}
