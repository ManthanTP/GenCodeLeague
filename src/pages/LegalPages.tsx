import { Badge } from '../components/ui/Badge';

export function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="subtle">DRAFT &bull; ORGANIZER REVIEW REQUIRED</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Data practices and credential record retention for the Gen Code League platform.
        </p>
      </div>

      <div className="gcl-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.6 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            1. Participant Information Handled
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            The GCL platform processes delegate full names, academic email addresses, institutional affiliations, departments, semester information, and tournament results necessary for team roster management and competition participation.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            2. Public vs. Private Data Isolation
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Personal contact details, academic USN numbers, and hidden evaluation scores are strictly protected under database row-level security (RLS). Public surfaces only expose verified participant names, team affiliations, and public certificate records.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            3. Credential Verification Registry
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Official certificate identifiers (e.g. GCL-YYYY-CERT-XXXXXX) remain in the permanent verification registry to facilitate ongoing employer, academic, and collegiate credential verification.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="subtle">DRAFT &bull; ORGANIZER REVIEW REQUIRED</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Terms of Competition</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Standard competitive framework and platform conditions for Gen Code League.
        </p>
      </div>

      <div className="gcl-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.6 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            1. League Authority & Rules Adherence
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            All registered squads, captains, and participants consent to abide by the official GCL rulebook, stage countdown locks, and adjudicator decisions.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            2. Certificate Issuance & Revocation
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Team captains are authorized to generate eligible certificates solely for members of their active squad. The GCL Administrative Committee retains unilateral authority to revoke any credential found to have been obtained through fraudulent participation or integrity violations.
          </p>
        </div>
      </div>
    </div>
  );
}
