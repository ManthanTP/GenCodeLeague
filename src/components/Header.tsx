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
          width: '100%',
          padding: '0 24px',
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
            gap: '0.65rem',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onClick={() => navigate('/')}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-2px', fontWeight: 700, fontSize: 'clamp(36px, 4.5vw, 72px)', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>
            <span style={{ color: '#fff' }}>GC</span>
            <span style={{ color: '#e8212e' }}>L</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #35353b', paddingLeft: '0.75rem', marginLeft: '0.2rem' }}>
            <span style={{ fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 600, letterSpacing: '0.3px', color: '#f4f4f6', textTransform: 'uppercase', lineHeight: 1.15, fontFamily: "'Rajdhani', sans-serif" }}>
              GEN CODE LEAGUE
            </span>
            <span style={{ fontSize: 'clamp(10px, 1.1vw, 14px)', fontWeight: 500, letterSpacing: '0.2px', color: '#9a9aa3', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e8212e' }} />
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Glass Navigation Buttons (Desktop XL only) */}
        {!isFullscreen && (
          <div className="hidden xl:flex items-center gap-2">
            {viewMode === 'admin' && (
              <div className="header-role-badge header-role-admin">
                <Shield size={18} />
                <span>ADMIN</span>
              </div>
            )}

            {viewMode === 'live' && (
              <nav className="flex items-center gap-2 shrink-0 flex-nowrap">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Mobile/Tablet Compact Budget Pill (Shown on screens < lg) */}
          <div className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181c] border border-[#2c2c33]">
            <Wallet size={15} className="text-[#ff4350] shrink-0" />
            <span className="text-xs font-bold text-[#ff4350] font-['Rajdhani',sans-serif] font-mono whitespace-nowrap">
              {displayBudget}
            </span>
          </div>

          {/* Desktop Stat Cards (Shown on Large screens >= lg) */}
          <div className="hidden lg:flex items-center gap-2.5">
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
            <div className="panel" style={{ minWidth: '140px', width: 'auto', height: '64px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Users size={28} style={{ color: '#f4f4f6', flexShrink: 0 }} />
              <div style={{ whiteSpace: 'nowrap' }}>
                <p style={{ fontSize: '13px', color: '#b5b5bd', fontWeight: 400, margin: 0, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                  Total Teams
                </p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#f4f4f6', margin: '0.15rem 0 0 0', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {displayTeams}
                </p>
              </div>
            </div>
          </div>

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

          {/* Mobile hamburger button */}
          {!isFullscreen && viewMode === 'live' && (
            <button
              className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-[#18181c] border border-[#2c2c33] text-[#f4f4f6] hover:text-[#ff4d5a] transition-all cursor-pointer shrink-0"
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
        <div style={{ background: 'rgba(14,14,18,0.98)', borderBottom: '1px solid #23232c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', backdropFilter: 'blur(16px)' }}>
          {/* Mobile Drawer Stats */}
          <div className="grid grid-cols-2 gap-2.5 pb-2 border-b border-[#23232c]">
            <div className="panel red p-2.5 rounded-lg flex items-center gap-2">
              <Wallet size={20} className="text-[#ff4350] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#9a9aa3] block font-sans">Remaining Budget</span>
                <span className="text-sm font-bold text-[#ff4350] block truncate font-['Rajdhani',sans-serif]">
                  {displayBudget}
                </span>
              </div>
            </div>
            <div className="panel p-2.5 rounded-lg flex items-center gap-2">
              <Users size={18} className="text-[#f4f4f6] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#9a9aa3] block font-sans">Total Teams</span>
                <span className="text-sm font-bold text-white block truncate font-['Rajdhani',sans-serif]">
                  {displayTeams} Teams
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Links */}
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isLinkActive(link.path, link.altPath);
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => { handleNavClick(link.path); setMobileMenuOpen(false); }}
                  className={active && link.isLive ? 'gcl-nav-btn-active' : 'gcl-nav-btn'}
                  style={{ width: '100%', justifyContent: 'flex-start', height: '44px' }}
                >
                  <Icon size={18} style={{ color: active && link.isLive ? '#ff4a56' : '#9a9aa3' }} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
