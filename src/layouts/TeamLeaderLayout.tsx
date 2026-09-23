import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function TeamLeaderLayout() {
  const { profile, team, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navTabs = [
    { label: 'Overview', path: '/team/dashboard' },
    { label: 'Live Arena', path: '/team/competition', badge: 'LIVE' },
    { label: 'Live Auction', path: '/team/auction' },
    { label: 'Purchased Items', path: '/team/roster' },
    { label: 'Score Breakdown', path: '/team/results' },
    { label: 'Team Members', path: '/team/members' },
    { label: 'Certificates', path: '/team/certificates' },
  ];

  return (
    <div className="app-container">
      <Navbar />

      {/* Team Leader Official Status Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          padding: '1.25rem 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            {/* Team Identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
                  {team?.name || 'Assigned Team'}
                </h1>
                <Badge variant="live" pulse>
                  TEAM LEADER
                </Badge>
                {team?.status && (
                  <Badge variant="subtle">
                    {team.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                Leader: <strong style={{ color: 'var(--text-primary)' }}>{profile?.full_name || profile?.email}</strong>
                {team?.college && ` • ${team.college}`}
                {team?.edition && ` • ${team.edition.name}`}
              </p>
            </div>

            {/* Live Competition Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Score
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                  {team?.score ?? 0} <span style={{ fontSize: '0.75rem' }}>pts</span>
                </div>
              </div>

              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Remaining Budget
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {team?.remaining_budget ?? 1000} <span style={{ fontSize: '0.75rem' }}>cr</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
              overflowX: 'auto',
            }}
          >
            {navTabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: active ? 'var(--border-default)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        <Outlet />
      </main>
    </div>
  );
}
