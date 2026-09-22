import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function Navbar() {
  const { isAuthenticated, profile, role, isAdmin, isCaptain, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        background: 'rgba(15, 17, 24, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontWeight: 800,
              fontSize: '1.125rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono)',
                boxShadow: 'var(--shadow-gold)',
              }}
            >
              GCL
            </div>
            <span>GEN CODE LEAGUE</span>
          </Link>

          {/* Current edition indicator */}
          <div className="edition-badge-desktop">
            <Badge variant="live" pulse>
              2026 LIVE
            </Badge>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <Link
            to="/editions"
            style={{
              fontSize: '0.875rem',
              color: isActive('/editions') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Editions
          </Link>
          <Link
            to="/teams"
            style={{
              fontSize: '0.875rem',
              color: isActive('/teams') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Teams
          </Link>
          <Link
            to="/rounds"
            style={{
              fontSize: '0.875rem',
              color: isActive('/rounds') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Rounds
          </Link>
          <Link
            to="/leaderboard"
            style={{
              fontSize: '0.875rem',
              color: isActive('/leaderboard') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Leaderboard
          </Link>
          <Link
            to="/results"
            style={{
              fontSize: '0.875rem',
              color: isActive('/results') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Results
          </Link>
          <Link
            to="/schedule"
            style={{
              fontSize: '0.875rem',
              color: isActive('/schedule') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Schedule
          </Link>
          <Link
            to="/rules"
            style={{
              fontSize: '0.875rem',
              color: isActive('/rules') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Rules
          </Link>
          <Link
            to="/verify/check"
            style={{
              fontSize: '0.875rem',
              color: isActive('/verify/check') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Verify
          </Link>
        </nav>

        {/* User Auth Action Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm">
                    Admin Console
                  </Button>
                </Link>
              )}
              {isCaptain && (
                <Link to="/team">
                  <Button variant="secondary" size="sm">
                    Captain Dashboard
                  </Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">
                  {profile?.full_name?.split(' ')[0] || 'Dashboard'}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/login?mode=signup">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '0.375rem 0.625rem',
              cursor: 'pointer',
              fontSize: '1.125rem',
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer"
          style={{
            position: 'absolute',
            top: 'var(--navbar-height)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <Link
            to="/editions"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Editions
          </Link>
          <Link
            to="/teams"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Teams
          </Link>
          <Link
            to="/rounds"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Rounds
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Leaderboard
          </Link>
          <Link
            to="/results"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Results
          </Link>
          <Link
            to="/schedule"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Schedule
          </Link>
          <Link
            to="/rules"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Rules
          </Link>
          <Link
            to="/verify/check"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Verify Certificate
          </Link>
          <Link
            to="/announcements"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Announcements
          </Link>
          <Link
            to="/gallery"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Gallery
          </Link>
          <Link
            to="/organizers"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}
          >
            Organizers
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav, .edition-badge-desktop {
            display: none !important;
          }
          .mobile-hamburger {
            display: block !important;
          }
        }
        @media (min-width: 901px) {
          .mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
