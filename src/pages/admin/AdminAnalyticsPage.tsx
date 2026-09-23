import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminAnalyticsPage() {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [metrics, setMetrics] = useState({
    teamsTotal: 0,
    teamsApproved: 0,
    teamsQualified: 0,
    participants: 0,
    certsTotal: 0,
    certsRevoked: 0,
    quizAttempts: 0,
    bidsTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
      if (edData) {
        setEdition(edData as Edition);

        const [teamsAll, teamsApp, teamsQual, membersCount, certsAll, certsRev, subsCount, transCount] = await Promise.all([
          supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
          supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id).eq('status', 'approved'),
          supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id).eq('status', 'qualified'),
          supabase.from('team_members').select('*', { count: 'exact', head: true }),
          supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
          supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id).eq('status', 'revoked'),
          supabase.from('submissions').select('*', { count: 'exact', head: true }),
          supabase.from('auction_transactions').select('*', { count: 'exact', head: true }),
        ]);

        setMetrics({
          teamsTotal: teamsAll.count || 0,
          teamsApproved: teamsApp.count || 0,
          teamsQualified: teamsQual.count || 0,
          participants: membersCount.count || 0,
          certsTotal: certsAll.count || 0,
          certsRevoked: certsRev.count || 0,
          quizAttempts: subsCount.count || 0,
          bidsTotal: transCount.count || 0,
        });
      }
      setLoading(false);
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" text="Compiling league analytics..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <Badge variant="gold">CONFIDENTIAL TELEMETRY</Badge>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Adjudication Eyes Only</span>
        </div>
        <h1 style={{ fontSize: '2rem' }}>League Analytics Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Operational metrics for {edition?.name || 'GCL 2026'}. Hidden scores and audit indicators are isolated.
        </p>
      </div>

      {/* Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        <div className="gcl-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Registration & Roster</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Squads Enrolled</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{metrics.teamsTotal}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Approved Squads</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-qualified)' }}>{metrics.teamsApproved}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Qualified to Stage 2</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{metrics.teamsQualified}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Individual Competitors</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{metrics.participants}</strong>
            </div>
          </div>
        </div>

        <div className="gcl-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Competition Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Synchronized Quiz Attempts</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{metrics.quizAttempts}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Live Auction Bids Transacted</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{metrics.bidsTotal}</strong>
            </div>
          </div>
        </div>

        <div className="gcl-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Credential Issuance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Certificates Issued</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-qualified)' }}>{metrics.certsTotal}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Revoked Credentials</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-eliminated)' }}>{metrics.certsRevoked}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
