import { useState } from 'react';
import { Hammer, Users, Eye, LogOut, Zap, Shield, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  totalSpent?: number;
  totalAvailable?: number;
  teamCount?: number;
  viewMode?: 'live' | 'admin' | 'team';
  onToggleView?: () => void;
  isAdminAuthenticated?: boolean;
  onLogout?: () => void;
}

export default function Header({
  totalSpent = 0,
  totalAvailable = 0,
  teamCount = 0,
  viewMode = 'live',
  onToggleView,
  isAdminAuthenticated = false,
  onLogout,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Hall of Fame', path: '/hall-of-fame', icon: '★' },
    { label: 'Certificates', path: '/my-certificates', icon: '◈' },
    { label: 'Gallery', path: '/gallery', icon: '▣' },
    { label: 'Updates', path: '/announcements', icon: '▲' },
    { label: 'FAQ', path: '/faq', icon: '?' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="gcl-header">
      <div className="gcl-header-inner">
        {/* Brand identity */}
        <div className="gcl-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-wrapper">
            <div className="brand-icon-glow"></div>
            <div className="brand-icon-box">
              <Hammer size={22} />
            </div>
          </div>
          <div className="brand-text-col">
            <h1 className="brand-heading">
              GEN<span className="brand-heading-accent">CODE</span>LEAGUE
            </h1>
            <div className="live-badge-row">
              <div className="live-dot"></div>
              <span className="live-subtext">
                {viewMode === 'admin' ? 'Admin Console' : viewMode === 'team' ? 'Team Dashboard' : 'Live Auction'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Navigation */}
        <div className="gcl-header-center flex items-center gap-4">
          {viewMode === 'admin' && (
            <div className="header-role-badge header-role-admin">
              <Shield size={14} />
              <span>ADMIN</span>
            </div>
          )}
          {viewMode === 'live' && (
            <div className="flex items-center gap-3">
              <div className="header-role-badge header-role-live">
                <Zap size={14} />
                <span>LIVE</span>
              </div>

              <nav className="gcl-nav-desktop">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className={`gcl-nav-link ${isActive(link.path) ? 'gcl-nav-link-active' : ''}`}
                  >
                    <span className="gcl-nav-icon">{link.icon}</span> {link.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Stats and Controls */}
        <div className="gcl-header-actions">
          <div className="gcl-stats-group">
            <div className="header-stat-pill stat-pill-available">
              <span className="stat-pill-icon">▲</span>
              <div>
                <p className="stat-label">Budget</p>
                <p className="stat-value-available">{formatCurrency(totalAvailable)}</p>
              </div>
            </div>
            <div className="header-stat-pill stat-pill-teams">
              <Users size={16} className="stat-pill-icon-svg" />
              <div>
                <p className="stat-label">Teams</p>
                <p className="stat-value-teams">{teamCount}</p>
              </div>
            </div>
          </div>

          <div className="gcl-buttons-row">
            {viewMode === 'admin' && onToggleView && (
              <button onClick={onToggleView} className="btn-header-view">
                <Eye size={16} /> Live View
              </button>
            )}

            {viewMode === 'admin' && isAdminAuthenticated && onLogout && (
              <button onClick={onLogout} className="btn-header-logout">
                <LogOut size={16} /> Logout
              </button>
            )}

            {/* Mobile hamburger menu */}
            {viewMode === 'live' && (
              <button
                className="gcl-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && viewMode === 'live' && (
        <div className="gcl-mobile-nav">
          {navLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              onClick={() => { navigate(link.path); setMobileMenuOpen(false); }}
              className={`gcl-mobile-nav-link ${isActive(link.path) ? 'gcl-mobile-nav-link-active' : ''}`}
            >
              <span className="gcl-nav-icon">{link.icon}</span> {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
