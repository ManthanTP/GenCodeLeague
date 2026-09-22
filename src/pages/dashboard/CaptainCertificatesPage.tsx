import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Certificate, CertificateType, TeamMember, Profile, Team, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

interface MemberWithProfile extends TeamMember {
  profiles?: Profile;
}

interface CertificateWithDetails extends Certificate {
  profiles?: Profile;
  certificate_types?: CertificateType;
}

export function CaptainCertificatesPage() {
  const { user, isCaptain, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('memberId');

  const [team, setTeam] = useState<Team | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [certTypes, setCertTypes] = useState<CertificateType[]>([]);
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedMemberId || '');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [achievementNote, setAchievementNote] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Preview & Print Modal
  const [previewCert, setPreviewCert] = useState<CertificateWithDetails | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (preselectedMemberId && members.some((m) => m.profile_id === preselectedMemberId)) {
      setSelectedMemberId(preselectedMemberId);
      setIsModalOpen(true);
    }
  }, [preselectedMemberId, members]);

  async function loadData() {
    setLoading(true);
    if (!user) return;

    // 1. Current Edition
    const { data: edData } = await supabase
      .from('editions')
      .select('*')
      .eq('is_current', true)
      .single();
    if (edData) setEdition(edData as Edition);

    // 2. Fetch Certificate Types
    const { data: typeData } = await supabase
      .from('certificate_types')
      .select('*')
      .eq('is_active', true);
    if (typeData && typeData.length > 0) {
      setCertTypes(typeData as CertificateType[]);
      setSelectedTypeId(typeData[0].id);
    }

    // 3. User's Team
    const { data: memData } = await supabase
      .from('team_members')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (memData) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memData.team_id)
        .single();

      if (teamData) {
        setTeam(teamData as Team);

        // Fetch team members
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`
            *,
            profiles:profile_id (*)
          `)
          .eq('team_id', teamData.id);
        if (teamMembers) setMembers(teamMembers as MemberWithProfile[]);

        // Fetch existing issued certificates for this team
        const { data: certsData } = await supabase
          .from('certificates')
          .select(`
            *,
            profiles:participant_id (*),
            certificate_types:certificate_type_id (*)
          `)
          .eq('team_id', teamData.id)
          .order('generated_at', { ascending: false });

        if (certsData) setCertificates(certsData as CertificateWithDetails[]);
      }
    }

    setLoading(false);
  }

  async function handleGenerateCertificate(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !edition || !selectedMemberId || !selectedTypeId || !user) return;

    setIsGenerating(true);
    setModalError(null);

    try {
      // 1. Check for duplicate certificate: same participant + type + edition
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id, certificate_id, status')
        .eq('edition_id', edition.id)
        .eq('participant_id', selectedMemberId)
        .eq('certificate_type_id', selectedTypeId)
        .maybeSingle();

      if (existingCert) {
        throw new Error(
          `A certificate of this type (${existingCert.certificate_id}) has already been issued for this squad member. Duplicates are restricted under PRD rules.`
        );
      }

      // 2. Generate unique certificate ID: GCL-YYYY-CERT-NNNNNN
      const randomSeq = Math.floor(100000 + Math.random() * 900000);
      const generatedId = `GCL-${edition.year}-CERT-${randomSeq}`;
      const verificationToken = `vt_${Math.random().toString(36).substring(2)}${Date.now()}`;

      // 3. Insert into database
      const { data: newCert, error: insertErr } = await supabase
        .from('certificates')
        .insert({
          certificate_id: generatedId,
          edition_id: edition.id,
          team_id: team.id,
          participant_id: selectedMemberId,
          certificate_type_id: selectedTypeId,
          achievement: achievementNote.trim() || 'Official Squad Member',
          status: 'active',
          generated_by: user.id,
          verification_token: verificationToken,
          template_version: 'GCL-V1',
        })
        .select(`
          *,
          profiles:participant_id (*),
          certificate_types:certificate_type_id (*)
        `)
        .single();

      if (insertErr) throw insertErr;

      // Close modal and show preview
      setIsModalOpen(false);
      setAchievementNote('');
      await loadData();
      if (newCert) {
        setPreviewCert(newCert as CertificateWithDetails);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to issue certificate.');
    } finally {
      setIsGenerating(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading certificate issuance engine..." />;
  }

  if (!team) {
    return (
      <div className="gcl-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Squad Configured</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You must be affiliated with an active squad to access certificate services.
        </p>
      </div>
    );
  }

  const selectedMemberProfile = members.find((m) => m.profile_id === selectedMemberId)?.profiles;
  const selectedTypeObj = certTypes.find((t) => t.id === selectedTypeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Badge variant="gold">CAPTAIN CERTIFICATE ENGINE</Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Squad: {team.name}</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Team Certificates</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
            Authorize and generate official verifiable certificates for enrolled squad members. All issued credentials are cryptographically logged with instant public QR verification.
          </p>
        </div>

        {(isCaptain || isAdmin) && (
          <Button variant="primary" onClick={() => { setIsModalOpen(true); setModalError(null); }}>
            + Issue Member Certificate
          </Button>
        )}
      </div>

      {/* Issued Certificates Table */}
      <section>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Issued Credentials Registry ({certificates.length})</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Official records for {team.name}. Status updates are reflected in real time.
          </p>
        </div>

        {certificates.length > 0 ? (
          <div className="table-responsive">
            <table className="gcl-table">
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Recipient Member</th>
                  <th>Certificate Type</th>
                  <th>Achievement / Distinction</th>
                  <th>Status</th>
                  <th>Issue Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                        {cert.certificate_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cert.profiles?.full_name || 'Member'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cert.profiles?.email}</div>
                    </td>
                    <td>
                      <Badge variant="subtle">
                        {cert.certificate_types?.name.toUpperCase() || 'PARTICIPATION'}
                      </Badge>
                    </td>
                    <td>{cert.achievement || 'Official Squad Member'}</td>
                    <td>
                      <Badge variant={cert.status === 'active' ? 'qualified' : 'eliminated'}>
                        {cert.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline" size="sm" onClick={() => setPreviewCert(cert)}>
                          View & Print
                        </Button>
                        <Link to={`/verify/${cert.certificate_id}`} target="_blank">
                          <Button variant="secondary" size="sm">
                            Verify QR
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--gold)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              📜
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Certificates Issued Yet</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto', fontSize: '0.9375rem' }}>
              No official credentials have been issued for members of {team.name}. As squad captain, you can generate certificates for your squad members now.
            </p>
            {(isCaptain || isAdmin) && (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Issue First Certificate
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Generation Flow Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue Squad Certificate">
        <form onSubmit={handleGenerateCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {modalError && (
            <div style={{ padding: '0.75rem', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {modalError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Step 1: Select Squad Member</label>
            <select
              className="form-select"
              required
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">-- Choose Roster Member --</option>
              {members.map((m) => (
                <option key={m.profile_id} value={m.profile_id}>
                  {m.profiles?.full_name || m.profiles?.email} ({m.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Step 2: Certificate Classification</label>
            <select
              className="form-select"
              required
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
            >
              {certTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Step 3: Achievement Distinction (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Lead Systems Engineer / Algorithmic Specialist"
              value={achievementNote}
              onChange={(e) => setAchievementNote(e.target.value)}
            />
          </div>

          {/* Quick Preview Card */}
          {selectedMemberProfile && (
            <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Certificate Preview</div>
              <div>Recipient: <strong style={{ color: 'var(--text-primary)' }}>{selectedMemberProfile.full_name}</strong></div>
              <div>Squad: <strong style={{ color: 'var(--text-primary)' }}>{team.name}</strong></div>
              <div>Type: <strong style={{ color: 'var(--gold)' }}>{selectedTypeObj?.name}</strong></div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isGenerating}>
              Authorize & Generate Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable / Downloadable Certificate Modal View */}
      {previewCert && (
        <Modal isOpen={!!previewCert} onClose={() => setPreviewCert(null)} title="Official League Credential" maxWidth="750px">
          <div
            id="gcl-printable-certificate"
            style={{
              background: '#090b10',
              border: '4px double var(--gold)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 2rem',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'var(--shadow-elevated)',
              color: '#f8f9fc',
            }}
          >
            {/* Seal / Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gold)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                GCL
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.05em' }}>
                  GEN CODE LEAGUE
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  OFFICIAL COMPETITIVE LEAGUE CERTIFICATION
                </div>
              </div>
            </div>

            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
              Certificate of {previewCert.certificate_types?.name || 'Participation'}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              This certifies that
            </p>

            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-default)', display: 'inline-block', paddingBottom: '0.25rem', minWidth: '320px' }}>
              {previewCert.profiles?.full_name || 'Competitor'}
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: '1.25rem auto', maxWidth: '500px', lineHeight: 1.6 }}>
              representing squad <strong style={{ color: 'var(--gold)' }}>{team.name}</strong> has satisfactorily completed technical requirements during <strong>{edition?.name || 'Gen Code League 2026'}</strong> in the designated capacity of <em>{previewCert.achievement || 'Official Squad Competitor'}</em>.
            </p>

            {/* Credential Meta Bar with QR Target */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1.5rem',
                marginTop: '2.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CERTIFICATE ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gold)' }}>
                  {previewCert.certificate_id}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Issued: {new Date(previewCert.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* QR Verification Placeholder / Visual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#141724', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    background: '#fff',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  QR
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  <div>Scan or visit to verify:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>/verify/{previewCert.certificate_id}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="outline" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
            <Link to={`/verify/${previewCert.certificate_id}`} target="_blank">
              <Button variant="primary">
                Open Public Verification Record &rarr;
              </Button>
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
