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
  Image as ImageIcon,
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
    { label: 'Gallery', path: '/gallery', icon: ImageIcon },
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

  const displayBudget = formatCurrency(totalAvailable || 0);
  const displayTeams = teamCount || 0;

  return (
    <header className="gcl-header-glass" style={{ width: '100%', position: 'sticky', top: 0, zIndex: 50 }}>
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '0 32px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          height: '100%',
        }}
      >
        {/* Brand identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onClick={() => navigate('/')}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-3px', fontWeight: 700, fontSize: '72px', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>
            <span style={{ color: '#fff' }}>GC</span>
            <span style={{ color: '#e8212e' }}>L</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #35353b', paddingLeft: '1rem', marginLeft: '0.25rem' }}>
            <span style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.3px', color: '#f4f4f6', textTransform: 'uppercase', lineHeight: 1.15, fontFamily: "'Rajdhani', sans-serif" }}>
              GEN CODE LEAGUE
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.2px', color: '#9a9aa3', display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.25rem' }}>
              <span className="dot" style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#e8212e' }} />
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Glass Navigation Buttons */}
        {!isFullscreen && (
          <div className="hidden xl:flex" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {viewMode === 'admin' && (
              <div className="header-role-badge header-role-admin">
                <Shield size={18} />
                <span>ADMIN</span>
              </div>
            )}

            {viewMode === 'live' && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'nowrap' }}>
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  const active = isLinkActive(link.path, link.altPath);

                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => handleNavClick(link.path)}
                      className={active && link.isLive ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      <IconComponent
                        size={22}
                        fill={link.label === 'Hall of Fame' ? (active && link.isLive ? '#ff4a56' : '#f4f4f6') : 'none'}
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{ whiteSpace: 'nowrap' }}>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}

        {/* Center: Fullscreen Status Badge */}
        {isFullscreen && (
          <div className="gcl-glass" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#ffffff', borderBottom: '2px solid #e11d2e', paddingBottom: '1px' }}>
              {(currentRoundName || 'ROUND 1').toUpperCase()}
            </span>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#9a98a2' }}>
              QUESTION {(questionIdx !== undefined ? questionIdx + 1 : 1)} OF {totalQuestions || 20}
            </span>
          </div>
        )}

        {/* Right Stats Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
          {/* Remaining Budget glass card */}
          <div className="panel red" style={{ width: '185px', height: '64px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Wallet size={32} style={{ strokeWidth: 2.2, color: '#f4f4f6', flexShrink: 0 }} />
            <div style={{ whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', color: '#b5b5bd', fontWeight: 400, margin: 0, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                Remaining Budget
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#ff4350', margin: '0.15rem 0 0 0', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {displayBudget}
              </p>
            </div>
          </div>

          {/* Total Teams glass card */}
          <div className="panel" style={{ width: '131px', height: '64px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Users size={32} style={{ color: '#f4f4f6', flexShrink: 0 }} />
            <div style={{ whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', color: '#b5b5bd', fontWeight: 400, margin: 0, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                Total Teams
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#f4f4f6', margin: '0.15rem 0 0 0', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {displayTeams}
              </p>
            </div>
          </div>

          {/* Exit Fullscreen Button */}
          {isFullscreen && onExitFullscreen && (
            <button
              type="button"
              onClick={onExitFullscreen}
              className="gcl-nav-btn-active"
              title="Exit Fullscreen Presentation Mode"
            >
              <Minimize size={13} style={{ color: '#e11d2e' }} />
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

          {/* Mobile hamburger */}
          {!isFullscreen && viewMode === 'live' && (
            <button
              className="xl:hidden"
              style={{ padding: '0.4rem', color: '#8d8b94', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
        <div style={{ background: 'rgba(18,18,21,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.path, link.altPath);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => { handleNavClick(link.path); setMobileMenuOpen(false); }}
                className={active && link.isLive ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Icon size={16} style={{ color: active ? '#e11d2e' : '#8d8b94' }} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
