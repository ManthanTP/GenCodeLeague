import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

export function TeamLeaderLayout() {
  const { team, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/team/dashboard' },
    { label: 'Competition', path: '/team/competition' },
    { label: 'Auction', path: '/team/auction' },
    { label: 'Roster', path: '/team/roster' },
    { label: 'Results', path: '/team/results' },
    { label: 'Members', path: '/team/members' },
    { label: 'Certificates', path: '/team/certificates' },
  ];

  return (
    <div className="app-container">
      <Navbar />

      {/* Team Leader Nav Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.375rem 1.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--accent-green)',
              marginRight: '0.75rem',
              flexShrink: 0,
            }}
          >
            {team?.name || 'MY TEAM'}
          </span>

          {navItems.map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '0.35rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.6875rem',
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: 'var(--font-display)',
                  color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  backgroundColor: isSelected ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {item.label}
              </Link>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <Link to="/live" target="_blank" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">👁 Live View</Button>
            </Link>
            <Button variant="danger" size="sm" onClick={() => signOut()}>
              🔒 Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Team Content Area */}
      <main className="container" style={{ flex: 1, padding: '1.5rem', paddingTop: '1.25rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
