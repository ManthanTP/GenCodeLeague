import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function Navbar() {
  const { isAuthenticated, profile, isAdmin, isTeamLeader, team, signOut } = useAuth();
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
              textDecoration: 'none',
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
          <Link to="/live" target="_blank" style={{ textDecoration: 'none' }}>
            <Badge variant="live" pulse>
              LIVE ARENA ↗
            </Badge>
          </Link>
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
              textDecoration: 'none',
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
              textDecoration: 'none',
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
              textDecoration: 'none',
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
              textDecoration: 'none',
            }}
          >
            Standings
          </Link>
          <Link
            to="/hall-of-fame"
            style={{
              fontSize: '0.875rem',
              color: isActive('/hall-of-fame') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Hall of Fame
          </Link>
          <Link
            to="/schedule"
            style={{
              fontSize: '0.875rem',
              color: isActive('/schedule') ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 500,
              textDecoration: 'none',
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
              textDecoration: 'none',
            }}
          >
            Rules
          </Link>
        </nav>

        {/* User Auth Action Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isAdmin && (
                <Link to="/admin/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="gold" size="sm">
                    Admin Console
                  </Button>
                </Link>
              )}
              {isTeamLeader && (
                <Link to="/team/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                    {team ? team.name : 'Team Console'}
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/team/login" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                  Team Leader
                </Button>
              </Link>
              <Link to="/admin/login" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">
                  Admin
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.375rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            aria-label="Toggle navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileMenuOpen ? (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
