import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '3.5rem 0 2rem 0',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand Info */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontWeight: 800,
                fontSize: '1.125rem',
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                GCL
              </div>
              <span>GEN CODE LEAGUE</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The permanent competitive coding and technology league platform supporting multi-stage elimination rounds, live auctions, and verified credentials.
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Standard: Permanent Edition Architecture
            </div>
          </div>

          {/* Competition Nav */}
          <div>
            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Competition
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <Link to="/editions" style={{ color: 'var(--text-secondary)' }}>All Editions</Link>
              <Link to="/teams" style={{ color: 'var(--text-secondary)' }}>Teams & Rosters</Link>
              <Link to="/rounds" style={{ color: 'var(--text-secondary)' }}>Competitive Rounds</Link>
              <Link to="/leaderboard" style={{ color: 'var(--text-secondary)' }}>Live Leaderboard</Link>
              <Link to="/results" style={{ color: 'var(--text-secondary)' }}>Official Results</Link>
              <Link to="/winners" style={{ color: 'var(--text-secondary)' }}>Hall of Fame</Link>
            </div>
          </div>

          {/* Event & Governance */}
          <div>
            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Information
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <Link to="/schedule" style={{ color: 'var(--text-secondary)' }}>Event Schedule</Link>
              <Link to="/rules" style={{ color: 'var(--text-secondary)' }}>Rulebook & Protocol</Link>
              <Link to="/announcements" style={{ color: 'var(--text-secondary)' }}>Announcements</Link>
              <Link to="/gallery" style={{ color: 'var(--text-secondary)' }}>Event Gallery</Link>
              <Link to="/organizers" style={{ color: 'var(--text-secondary)' }}>Organizing Committee</Link>
              <Link to="/contact" style={{ color: 'var(--text-secondary)' }}>Contact Organizers</Link>
            </div>
          </div>

          {/* Verification & Legal */}
          <div>
            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Credentials & Legal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <Link to="/verify/check" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                Verify Certificate ID
              </Link>
              <Link to="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</Link>
              <Link to="/terms" style={{ color: 'var(--text-secondary)' }}>Terms of Competition</Link>
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Official verification root:</span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>/verify/:certificateId</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subfooter */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Gen Code League (GCL). All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Permanent League Platform</span>
            <span>v1.0 Production</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
