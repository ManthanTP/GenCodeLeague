import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Certificate, CertificateType, Edition, Team, Profile } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface CertRecord extends Certificate {
  certificate_types?: CertificateType;
  editions?: Edition;
  teams?: Team;
  profiles?: Profile;
}

export function AdminCertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<CertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  async function loadCertificates() {
    setLoading(true);
    const { data } = await supabase
      .from('certificates')
      .select(`
        *,
        certificate_types:certificate_type_id (*),
        editions:edition_id (*),
        teams:team_id (*),
        profiles:participant_id (*)
      `)
      .order('created_at', { ascending: false });

    if (data) setCerts(data as CertRecord[]);
    setLoading(false);
  }

  async function handleRevoke(certId: string) {
    if (!confirm('Are you sure you want to revoke this certificate? This will invalidate its public verification record.')) return;
    if (!user) return;

    await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', certId);

    await loadCertificates();
  }

  async function handleReinstate(certId: string) {
    await supabase
      .from('certificates')
      .update({
        status: 'active',
        revoked_by: null,
        revoked_at: null,
      })
      .eq('id', certId);

    await loadCertificates();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Master Certificate Administration</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Audit, authenticate, and manage digital credentials issued across all tournament editions.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading credential audit log..." />
      ) : certs.length > 0 ? (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Certificate ID</th>
                <th>Recipient</th>
                <th>Squad</th>
                <th>Season</th>
                <th>Classification</th>
                <th>Status</th>
                <th>Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                    {c.certificate_id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.profiles?.full_name || 'Competitor'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.profiles?.email}</div>
                  </td>
                  <td>{c.teams?.name || 'Squad'}</td>
                  <td>{c.editions?.year || '2026'}</td>
                  <td>
                    <Badge variant="subtle">
                      {c.certificate_types?.name.toUpperCase() || 'PARTICIPATION'}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={c.status === 'active' ? 'qualified' : 'eliminated'}>
                      {c.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    {c.status === 'active' ? (
                      <Button variant="danger" size="sm" onClick={() => handleRevoke(c.id)}>
                        Revoke Credential
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleReinstate(c.id)}>
                        Reinstate Credential
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="gcl-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>No Certificates Issued in Master Registry</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Credentials issued by team captains will appear here with full administrative audit logs.
          </p>
        </div>
      )}
    </div>
  );
}
