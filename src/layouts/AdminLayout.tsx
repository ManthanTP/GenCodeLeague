import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

export function AdminLayout() {
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'Live Control', path: '/admin/live-control', icon: '⚡' },
    { label: 'Auction', path: '/admin/auction', icon: '🔨' },
    { label: 'Scoreboard', path: '/admin/scoreboard', icon: '🏆' },
    { label: 'Tie-Break', path: '/admin/tie-breaker', icon: '⚖️' },
    { label: 'Podium', path: '/admin/winner-reveal', icon: '🥇' },
    { label: 'Editions', path: '/admin/editions', icon: '📅' },
    { label: 'Teams', path: '/admin/teams', icon: '🛡️' },
    { label: 'Rounds', path: '/admin/rounds', icon: '🎯' },
    { label: 'Questions', path: '/admin/questions', icon: '❓' },
    { label: 'Leaderboard', path: '/admin/leaderboard', icon: '📋' },
    { label: 'Results', path: '/admin/results', icon: '📊' },
    { label: 'Certificates', path: '/admin/certificates', icon: '📜' },
    { label: 'Schedule', path: '/admin/schedule', icon: '⏰' },
    { label: 'Announcements', path: '/admin/announcements', icon: '📢' },
    { label: 'Gallery', path: '/admin/gallery', icon: '🖼️' },
    { label: 'Committee', path: '/admin/organizers', icon: '👥' },
    { label: 'Analytics', path: '/admin/analytics', icon: '📈' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: '🔒' },
  ];

  return (
    <div className="app-container">
      <Navbar />

      {/* Admin Tab Bar — compact horizontal nav */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.125rem',
            padding: '0.375rem 1.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginRight: '0.75rem',
              flexShrink: 0,
            }}
          >
            ADMIN
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Content Area — Full Width */}
      <main className="container" style={{ flex: 1, padding: '1.5rem', paddingTop: '1.25rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
