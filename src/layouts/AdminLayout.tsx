import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Badge } from '../components/ui/Badge';

export function AdminLayout() {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/admin' },
    { label: 'Editions', path: '/admin/editions' },
    { label: 'Teams', path: '/admin/teams' },
    { label: 'Participants', path: '/admin/participants' },
    { label: 'Rounds', path: '/admin/rounds' },
    { label: 'Questions', path: '/admin/questions' },
    { label: 'Quiz Control', path: '/admin/quiz' },
    { label: 'Auction Console', path: '/admin/auction' },
    { label: 'Leaderboard', path: '/admin/leaderboard' },
    { label: 'Results', path: '/admin/results' },
    { label: 'Certificates', path: '/admin/certificates' },
    { label: 'Schedule', path: '/admin/schedule' },
    { label: 'Announcements', path: '/admin/announcements' },
    { label: 'Gallery', path: '/admin/gallery' },
    { label: 'Organizers', path: '/admin/organizers' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Settings', path: '/admin/settings' },
    { label: 'Audit Logs', path: '/admin/audit-logs' },
  ];

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
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="gold">ADMIN CONSOLE</Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Master Management &bull; Authenticated as {profile?.full_name || profile?.email || 'Admin'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Active League Edition:</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>GCL 2026</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ flex: 1, display: 'flex', gap: '2rem', padding: '2rem 1.5rem' }}>
        {/* Admin Sidebar Navigation */}
        <aside
          style={{
            width: '230px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem',
            alignSelf: 'flex-start',
          }}
        >
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            League Controls
          </div>
          {navItems.map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--gold)' : 'var(--text-secondary)',
                  backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <span>{item.label}</span>
                {isSelected && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--gold)' }} />}
              </Link>
            );
          })}
        </aside>

        {/* Admin Content Area */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
