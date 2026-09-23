import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Certificate, CertificateType, Edition, Team, Profile } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface VerifiedRecord extends Certificate {
  certificate_types?: CertificateType;
  editions?: Edition;
  teams?: Team;
  profiles?: Profile;
}

export function VerifyCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(certificateId && certificateId !== 'check' ? certificateId : '');
  const [record, setRecord] = useState<VerifiedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (certificateId && certificateId !== 'check') {
      performVerification(certificateId);
    }
  }, [certificateId]);

  async function performVerification(idToVerify: string) {
    const cleanId = idToVerify.trim();
    if (!cleanId) return;

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          certificate_types:certificate_type_id (*),
          editions:edition_id (*),
          teams:team_id (*),
          profiles:participant_id (*),
          team_members:team_member_id (*)
        `)
        .eq('certificate_id', cleanId)
        .maybeSingle();

      if (error) {
        console.error('Verification error:', error);
        setErrorMsg('Database query error while verifying certificate identifier.');
      } else if (!data) {
        setRecord(null);
      } else {
        setRecord(data as VerifiedRecord);
      }
    } catch (err) {
      setErrorMsg('Unexpected network error occurred during certificate verification.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/verify/${encodeURIComponent(searchInput.trim())}`);
      performVerification(searchInput.trim());
    }
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '780px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
          <Badge variant="primary">CREDENTIAL INTEGRITY PROTOCOL</Badge>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>Certificate Verification</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
          Verify the authenticity of any official Gen Code League credential, certificate of participation, achievement, or special recognition.
        </p>

        {/* Search / Lookup Form */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: '0.75rem',
            maxWidth: '520px',
            margin: '2rem auto 0 auto',
          }}
        >
          <input
            type="text"
            className="form-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. GCL-2026-CERT-000123"
            style={{
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: 1,
            }}
            required
          />
          <Button type="submit" variant="primary" isLoading={loading}>
            Verify
          </Button>
        </form>
      </div>

      {loading && <LoadingSpinner size="lg" text="Authenticating certificate with league cryptographic registry..." />}

      {errorMsg && (
        <div className="gcl-card" style={{ borderColor: 'var(--status-eliminated-border)', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', textAlign: 'center', padding: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      {!loading && searched && !record && !errorMsg && (
        <div
          className="gcl-card"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            border: '1px solid var(--status-eliminated-border)',
            background: 'rgba(239, 68, 68, 0.04)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--status-eliminated-bg)',
              color: 'var(--status-eliminated)',
              margin: '0 auto 1.25rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
            }}
          >
            ✕
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Certificate Not Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            No credential matches identifier <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{searchInput}</strong>. Please confirm the exact certificate ID printed on the physical credential or QR link.
          </p>
        </div>
      )}

      {!loading && record && (
        <div
          className="gcl-card"
          style={{
            border: '1px solid var(--border-gold)',
            background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
            boxShadow: 'var(--shadow-elevated)',
            padding: '2.5rem',
            position: 'relative',
          }}
        >
          {/* Official Verification Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gold)',
                  color: '#000',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                }}
              >
                GCL
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  GEN CODE LEAGUE OFFICIAL VERIFICATION
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700, fontSize: '0.9375rem' }}>
                  {record.certificate_id}
                </div>
              </div>
            </div>

            <Badge variant={record.status === 'active' ? 'qualified' : 'eliminated'}>
              {record.status === 'active' ? '✓ CERTIFIED ACTIVE' : '⚠ REVOKED'}
            </Badge>
          </div>

          {/* Core Certificate Record Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recipient Name
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {record.recipient_name || (record as any).team_members?.full_name || record.profiles?.full_name || 'Competitor'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Team Affiliation
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {record.teams?.name || 'Squad Member'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Certificate Type
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--gold)', marginTop: '0.25rem' }}>
                {record.certificate_types?.name || 'Participation'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tournament Edition
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {record.editions?.name || 'GCL Season'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Issue Date
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {record.issue_date || new Date(record.created_at).toLocaleDateString()}
              </div>
            </div>

            {record.achievement && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recognized Achievement
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {record.achievement}
                </div>
              </div>
            )}
          </div>

          {/* Revocation notice if revoked */}
          {record.status === 'revoked' && (
            <div
              style={{
                padding: '1rem',
                background: 'var(--status-eliminated-bg)',
                border: '1px solid var(--status-eliminated-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--status-eliminated)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              <strong>Notice:</strong> This certificate was officially revoked on {record.revoked_at ? new Date(record.revoked_at).toLocaleDateString() : 'Record Date'}. It is no longer recognized as a valid tournament qualification.
            </div>
          )}

          {/* Cryptographic Authenticity Seal */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span>Verified against Gen Code League Permanent Master Registry</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Template: {record.template_version || 'GCL-V1'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
