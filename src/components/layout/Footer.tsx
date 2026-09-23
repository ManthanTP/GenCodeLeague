import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.5rem 0',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-cyan)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.5rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ⚡
            </div>
            <span>© {new Date().getFullYear()} Gen Code League (GCL)</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.6875rem' }}>
            <Link to="/teams" style={{ color: 'var(--text-muted)' }}>Teams</Link>
            <Link to="/leaderboard" style={{ color: 'var(--text-muted)' }}>Leaderboard</Link>
            <Link to="/rules" style={{ color: 'var(--text-muted)' }}>Rules</Link>
            <Link to="/verify/check" style={{ color: 'var(--accent-cyan)' }}>Verify Certificate</Link>
            <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
            <Link to="/terms" style={{ color: 'var(--text-muted)' }}>Terms</Link>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-disabled)' }}>
            BID. COMPETE. CODE.
          </div>
        </div>
      </div>
    </footer>
  );
}
