import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const primaryOps = [
    { label: 'Master Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'Live Master Control', path: '/admin/live-control', icon: '⚡', highlight: true },
    { label: 'Auction Console', path: '/admin/auction', icon: '🔨' },
    { label: 'Official Scoreboard', path: '/admin/scoreboard', icon: '🏆' },
    { label: 'Tie Breakers', path: '/admin/tie-breaker', icon: '⚖️' },
    { label: 'Podium Reveal', path: '/admin/winner-reveal', icon: '🥇' },
  ];

  const leagueManagement = [
    { label: 'Editions', path: '/admin/editions', icon: '📅' },
    { label: 'Teams & Leaders', path: '/admin/teams', icon: '🛡️' },
    { label: 'Rounds', path: '/admin/rounds', icon: '🎯' },
    { label: 'Questions Bank', path: '/admin/questions', icon: '❓' },
    { label: 'Certificates', path: '/admin/certificates', icon: '📜' },
  ];

  const contentAndSystem = [
    { label: 'Schedule', path: '/admin/schedule', icon: '⏰' },
    { label: 'Announcements', path: '/admin/announcements', icon: '📢' },
    { label: 'Photo Gallery', path: '/admin/gallery', icon: '🖼️' },
    { label: 'Committee', path: '/admin/organizers', icon: '👥' },
    { label: 'Analytics', path: '/admin/analytics', icon: '📈' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: '🔒' },
  ];

  const renderNavGroup = (title: string, items: typeof primaryOps) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {items.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? 'var(--gold)' : item.highlight ? '#fbbf24' : 'var(--text-secondary)',
                backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.9375rem' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {isSelected && (
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--gold)' }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Navbar />

      {/* Admin Top Status Bar */}
      <div
        style={{
          background: '#0d0f17',
          borderBottom: '1px solid var(--border-default)',
          padding: '0.75rem 0',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="gold">ADMIN OPERATIONS</Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Master Console &bull; {profile?.full_name || profile?.email || 'Administrator'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/live" target="_blank" style={{ textDecoration: 'none' }}>
              <Badge variant="live" pulse>
                OPEN PROJECTOR VIEW ↗
              </Badge>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container" style={{ flex: 1, display: 'flex', gap: '2rem', padding: '2rem 1.5rem', alignItems: 'flex-start' }}>
        {/* Admin Sidebar Navigation */}
        <aside
          style={{
            width: '240px',
            flexShrink: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem',
            position: 'sticky',
            top: 'calc(var(--navbar-height) + 1rem)',
            maxHeight: 'calc(100vh - var(--navbar-height) - 2rem)',
            overflowY: 'auto',
          }}
        >
          {renderNavGroup('Live Operations', primaryOps)}
          {renderNavGroup('Tournament League', leagueManagement)}
          {renderNavGroup('Content & System', contentAndSystem)}
        </aside>

        {/* Admin Content Area */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
