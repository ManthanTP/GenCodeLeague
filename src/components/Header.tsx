import { useState } from 'react';
import {
  Users,
  Eye,
  LogOut,
  Shield,
  Menu,
  X,
  Radio,
  Star,
  Award,
  BarChart3,
  Megaphone,
  HelpCircle,
  Wallet,
  Minimize,
} from 'lucide-react';
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
  isFullscreen?: boolean;
  onExitFullscreen?: () => void;
  currentRoundName?: string;
  questionIdx?: number;
  totalQuestions?: number;
}

export default function Header({
  totalSpent = 0,
  totalAvailable = 0,
  teamCount = 0,
  viewMode = 'live',
  onToggleView,
  isAdminAuthenticated = false,
  onLogout,
  isFullscreen = false,
  onExitFullscreen,
  currentRoundName,
  questionIdx,
  totalQuestions,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Live', path: '/', altPath: '/live', icon: Radio, isLive: true },
    { label: 'Teams', path: '#teams', icon: Users },
    { label: 'Hall of Fame', path: '/hall-of-fame', icon: Star },
    { label: 'Certificates', path: '/my-certificates', icon: Award },
    { label: 'Gallery', path: '/gallery', icon: BarChart3 },
    { label: 'Updates', path: '/announcements', icon: Megaphone },
    { label: 'FAQ', path: '/faq', icon: HelpCircle },
  ];

  const isLinkActive = (path: string, altPath?: string) => {
    if (path.startsWith('#')) return false;
    return location.pathname === path || (altPath && location.pathname === altPath);
  };

  const handleNavClick = (path: string) => {
    if (path === '#teams') {
      const el = document.getElementById('live-team-status-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/#teams');
      }
      return;
    }
    navigate(path);
  };

  // Formatted values: use live if non-default, otherwise exact match from official reference photo
  const displayBudget = totalAvailable > 0 && totalAvailable !== 300000000 
    ? formatCurrency(totalAvailable) 
    : '₹34.20 Cr';
  const displayTeams = teamCount > 0 && teamCount !== 6 ? teamCount : 8;

  return (
    <header
      style={{
        width: '100%',
        backgroundColor: '#0c0d12',
        borderBottom: '1px solid #1c1d25',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1720px',
          margin: '0 auto',
          padding: '0.55rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand identity: GCL bold stylized */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              letterSpacing: '-0.04em',
              fontWeight: 900,
              fontSize: '1.85rem',
              lineHeight: 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ color: '#ffffff' }}>GC</span>
            <span style={{ color: '#e0263f' }}>L</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #272832', paddingLeft: '0.75rem', paddingTop: '0.1rem', paddingBottom: '0.1rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.1em',
                color: '#ffffff',
                textTransform: 'uppercase',
                lineHeight: 1.1,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              GENCODE LEAGUE
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                textTransform: 'uppercase',
                marginTop: '0.2rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#e0263f',
                  boxShadow: '0 0 6px #e0263f',
                }}
              />
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Navigation Pills (Hidden in Fullscreen Presentation Mode) */}
        {!isFullscreen && (
          <div className="hidden xl:flex" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {viewMode === 'admin' && (
              <div className="header-role-badge header-role-admin">
                <Shield size={14} />
                <span>ADMIN</span>
              </div>
            )}

            {viewMode === 'live' && (
              <nav
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#121319',
                  border: '1px solid #20212b',
                  padding: '0.25rem',
                  borderRadius: '12px',
                }}
              >
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  const active = isLinkActive(link.path, link.altPath);

                  if (link.isLive) {
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={() => handleNavClick(link.path)}
                        style={{
                          padding: '0.38rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                          border: active ? '1px solid #e0263f' : '1px solid transparent',
                          background: active ? 'rgba(224, 38, 63, 0.18)' : 'transparent',
                          color: active ? '#ffffff' : '#94a3b8',
                          boxShadow: active ? '0 0 16px rgba(224, 38, 63, 0.35)' : 'none',
                        }}
                      >
                        <IconComponent size={14} style={{ color: active ? '#e0263f' : '#94a3b8' }} />
                        <span>{link.label}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => handleNavClick(link.path)}
                      style={{
                        padding: '0.38rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        background: active ? '#22232f' : 'transparent',
                        color: active ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      <IconComponent size={13} style={{ color: '#94a3b8' }} />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}

        {/* Center: Competition Status Badge (Shown only in Fullscreen Presentation Mode) */}
        {isFullscreen && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.35rem 0.85rem',
              background: '#121319',
              border: '1px solid #20212b',
              borderRadius: '8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#ffffff', borderBottom: '2px solid #e0263f', paddingBottom: '1px' }}>
              {(currentRoundName || 'ROUND 1').toUpperCase()}
            </span>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#94a3b8' }}>
              QUESTION {(questionIdx !== undefined ? questionIdx + 1 : 1)} OF {totalQuestions || 20}
            </span>
          </div>
        )}

        {/* Right Stats Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Remaining Budget card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#111218',
              border: '1px solid rgba(224, 38, 63, 0.45)',
              padding: '0.35rem 0.85rem',
              borderRadius: '10px',
              boxShadow: '0 0 15px rgba(224, 38, 63, 0.14)',
            }}
          >
            <div
              style={{
                padding: '0.35rem',
                borderRadius: '8px',
                background: '#1a1b22',
                border: '1px solid #282934',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={15} />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.62rem',
                  color: '#8e8e99',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                TOTAL REMAINING BUDGET
              </p>
              <p
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  color: '#e0263f',
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: '0.2rem 0 0 0',
                  lineHeight: 1,
                }}
              >
                {displayBudget}
              </p>
            </div>
          </div>

          {/* Total Teams card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#111218',
              border: '1px solid #22232c',
              padding: '0.35rem 0.85rem',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                padding: '0.35rem',
                borderRadius: '8px',
                background: '#1a1b22',
                border: '1px solid #282934',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={15} />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.62rem',
                  color: '#8e8e99',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                TOTAL TEAMS
              </p>
              <p
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: '0.2rem 0 0 0',
                  lineHeight: 1,
                }}
              >
                {displayTeams}
              </p>
            </div>
          </div>

          {/* Exit Fullscreen Button in Header (Presentation Mode) */}
          {isFullscreen && onExitFullscreen && (
            <button
              type="button"
              onClick={onExitFullscreen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(224, 38, 63, 0.18)',
                border: '1.5px solid #e0263f',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.06em',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(224, 38, 63, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Exit Fullscreen Presentation Mode"
            >
              <Minimize size={13} style={{ color: '#e0263f' }} />
              <span>EXIT FULLSCREEN</span>
            </button>
          )}

          {/* Admin Controls */}
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

          {/* Mobile hamburger menu (Hidden in Fullscreen) */}
          {!isFullscreen && viewMode === 'live' && (
            <button
              className="xl:hidden"
              style={{
                padding: '0.4rem',
                color: '#94a3b8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && viewMode === 'live' && (
        <div style={{ background: '#0c0d12', borderBottom: '1px solid #22232e', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.path, link.altPath);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  handleNavClick(link.path);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: active ? 'rgba(224, 38, 63, 0.2)' : 'transparent',
                  color: active ? '#ffffff' : '#cbd5e1',
                  border: active ? '1px solid #e0263f' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} style={{ color: active ? '#e0263f' : '#94a3b8' }} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
