import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Badge } from '../components/ui/Badge';

export function DashboardLayout() {
  const { profile, role, isCaptain, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-container">
      <Navbar />

      {/* Subheader Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '1.25rem 0',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
                {isCaptain ? 'Captain & Team Portal' : 'Participant Dashboard'}
              </h2>
              <Badge variant={isAdmin ? 'gold' : isCaptain ? 'live' : 'subtle'}>
                {role ? role.toUpperCase() : 'PARTICIPANT'}
              </Badge>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {profile?.full_name || 'Competitor'} &bull; {profile?.college || 'Institution Not Configured'}
            </p>
          </div>

          {/* Quick Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              to="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive('/dashboard') ? 'var(--bg-elevated)' : 'transparent',
                color: isActive('/dashboard') ? 'var(--gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive('/dashboard') ? 'var(--border-default)' : 'transparent',
              }}
            >
              Overview
            </Link>

            <Link
              to="/team"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive('/team') ? 'var(--bg-elevated)' : 'transparent',
                color: isActive('/team') ? 'var(--gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive('/team') ? 'var(--border-default)' : 'transparent',
              }}
            >
              Team Roster
            </Link>

            <Link
              to="/team/certificates"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive('/team/certificates') ? 'var(--bg-elevated)' : 'transparent',
                color: isActive('/team/certificates') ? 'var(--gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive('/team/certificates') ? 'var(--border-default)' : 'transparent',
              }}
            >
              Certificates {isCaptain && <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>★</span>}
            </Link>

            <Link
              to="/team/auction"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive('/team/auction') ? 'var(--bg-elevated)' : 'transparent',
                color: isActive('/team/auction') ? 'var(--gold)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive('/team/auction') ? 'var(--border-default)' : 'transparent',
              }}
            >
              Auction Room
            </Link>
          </nav>
        </div>
      </div>

      <main className="main-content" style={{ padding: '2rem 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
