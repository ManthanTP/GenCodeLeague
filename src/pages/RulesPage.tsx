import { Badge } from '../components/ui/Badge';

export function RulesPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '860px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="primary">OFFICIAL CODEX</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>League Rules & Protocol</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Standardized competition regulations enforced across all Gen Code League tournament divisions.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
            1. Team Composition & Eligibility
          </h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem' }}>
            <li>Each squad must consist of registered members affiliated with an authorized educational institution or verified technical program.</li>
            <li>One member must be formally designated as <strong>Team Captain</strong>. The Captain possesses sole authorization for bidding actions and team certificate requests.</li>
            <li>No competitor may participate under more than one squad roster during the same tournament edition.</li>
          </ul>
        </div>

        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
            2. Stage 1: Elimination Quiz Protocol
          </h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem' }}>
            <li>The quiz round is tightly timed. The client incorporates an automated countdown synchronization engine.</li>
            <li>Upon timer expiration, answers are committed and locked automatically. No manual grace period will be granted.</li>
            <li>Tie-breakers are resolved based on total submission latency: squads submitting correct answers in less cumulative time achieve higher rank.</li>
          </ul>
        </div>

        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
            3. Stage 2: Auction Mechanics & Budget Rules
          </h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem' }}>
            <li>Every qualified team receives an identical starting virtual budget allocated at round commencement.</li>
            <li>Bids must increment by prescribed minimum margins. Any bid exceeding current remaining squad funds is rejected server-side.</li>
            <li>Winning bids are final upon auction hammer adjudication. The transaction log is immutable and recorded in the tournament audit trail.</li>
          </ul>
        </div>

        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
            4. Integrity, Plagiarism & Disqualification
          </h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem' }}>
            <li>Unauthorized code duplication or external telecommunications during active evaluation rounds will trigger instantaneous squad disqualification.</li>
            <li>All official decisions rendered by the GCL Technical Adjudicators are final and binding.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
