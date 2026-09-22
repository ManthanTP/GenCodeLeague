import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function ContactPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '720px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="gold">LIAISON & SUPPORT</Badge>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Contact Tournament Desk</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Official communications channel for collegiate delegations, technical enquiries, and credential appeals.
        </p>
      </div>

      <div className="gcl-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            OFFICIAL CORRESPONDENCE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            contact@gencodeleague.org
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            LEAGUE PHYSICAL DESK
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9375rem' }}>
            Main Auditorium & Digital Arena &bull; Gen Code League Technical Center
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Submit Inquiry to Tournament Desk</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Inquiry logged. Tournament liaisons review messages within competition hours.');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" required placeholder="Delegate / Captain Name" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Institutional Email</label>
              <input type="email" className="form-input" required placeholder="captain@college.edu" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Query Category</label>
              <select className="form-select">
                <option>Team Registration & Roster</option>
                <option>Certificate Verification Inquiry</option>
                <option>Technical Environment Appeal</option>
                <option>General Competition Inquiries</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Message</label>
              <textarea className="form-textarea" rows={4} required placeholder="Detailed inquiry..." />
            </div>
            <Button type="submit" variant="primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
              Transmit Inquiry
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
