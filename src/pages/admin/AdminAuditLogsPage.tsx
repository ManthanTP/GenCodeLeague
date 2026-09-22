import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuditLog, Profile } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface LogWithActor extends AuditLog {
  actor?: Profile;
}

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LogWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*, actor:actor_id (*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data as LogWithActor[]);
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <Badge variant="subtle">SECURITY AUDIT LEDGER</Badge>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Immutable Operations History</span>
        </div>
        <h1 style={{ fontSize: '2rem' }}>Administrative Audit Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Detailed record of sensitive administrative actions including certificate revocations, score adjustments, and round locks.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading security ledger..." />
      ) : logs.length > 0 ? (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource Type</th>
                <th>Resource ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.actor?.full_name || 'System / Admin'}</td>
                  <td>
                    <Badge variant="gold">{log.action}</Badge>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {log.resource_type}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    {log.resource_id ? `${log.resource_id.slice(0, 8)}...` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🔒
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Audit Ledger Active</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Operations performed in the Admin Console will record tamper-resistant security entries into this ledger.
          </p>
        </div>
      )}
    </div>
  );
}
