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
    <header className="gcl-header-glass w-full sticky top-0 z-50 transition-all">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 md:px-8 w-full flex items-center justify-between gap-3 h-full">
        {/* Brand identity */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink-0"
          onClick={() => navigate('/')}
        >
          <div
            className="flex items-baseline font-bold leading-none font-['Rajdhani',sans-serif]"
            style={{ letterSpacing: '-2px' }}
          >
            <span className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">GC</span>
            <span className="text-[#e8212e] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">L</span>
          </div>

          <div className="flex flex-col border-l border-[#35353b] pl-2 sm:pl-3 ml-1">
            <span className="text-sm sm:text-lg md:text-xl font-bold tracking-tight text-[#f4f4f6] uppercase leading-tight font-['Rajdhani',sans-serif]">
              GEN CODE LEAGUE
            </span>
            <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-[#9a9aa3] flex items-center gap-1.5 mt-0.5">
              <span className="dot w-2 h-2 rounded-full bg-[#e8212e] shrink-0" />
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Glass Navigation Buttons (Desktop XL) */}
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
                        size={20}
                        fill={link.label === 'Hall of Fame' ? (active && link.isLive ? '#ff4a56' : '#f4f4f6') : 'none'}
                        className="shrink-0"
                      />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}

        {/* Center: Fullscreen Status Badge */}
        {isFullscreen && (
          <div className="gcl-glass px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold flex items-center gap-2 font-mono">
            <span className="text-white border-b-2 border-[#e11d2e] pb-0.5">
              {(currentRoundName || 'ROUND 1').toUpperCase()}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-[#9a9aa3]">
              Q {(questionIdx !== undefined ? questionIdx + 1 : 1)}/{totalQuestions || 20}
            </span>
          </div>
        )}

        {/* Right Stats & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Desktop/Tablet Stat Cards (Shown on Large screens) */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Remaining Budget glass card */}
            <div className="panel red h-14 sm:h-16 rounded-xl px-3 sm:px-4 flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <Wallet size={24} className="text-[#f4f4f6] shrink-0" />
              <div>
                <p className="text-[11px] text-[#b5b5bd] leading-none font-sans">
                  Remaining Budget
                </p>
                <p className="text-lg sm:text-xl font-bold text-[#ff4350] mt-1 leading-none font-['Rajdhani',sans-serif] font-mono">
                  {displayBudget}
                </p>
              </div>
            </div>

            {/* Total Teams glass card */}
            <div className="panel h-14 sm:h-16 rounded-xl px-3 sm:px-4 flex items-center gap-2 whitespace-nowrap shrink-0">
              <Users size={22} className="text-[#f4f4f6] shrink-0" />
              <div>
                <p className="text-[11px] text-[#b5b5bd] leading-none font-sans">
                  Total Teams
                </p>
                <p className="text-lg sm:text-xl font-bold text-[#f4f4f6] mt-1 leading-none font-['Rajdhani',sans-serif] font-mono">
                  {displayTeams}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          {viewMode === 'admin' && onToggleView && (
            <button onClick={onToggleView} className="btn-header-view text-xs py-2 px-3">
              <Eye size={15} /> <span className="hidden sm:inline">Live View</span>
            </button>
          )}
          {viewMode === 'admin' && isAdminAuthenticated && onLogout && (
            <button onClick={onLogout} className="btn-header-logout text-xs py-2 px-3">
              <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
            </button>
          )}

          {/* Mobile hamburger toggle (Large touch target) */}
          {!isFullscreen && viewMode === 'live' && (
            <button
              className="xl:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-[#18181c] border border-[#2c2c33] text-[#f4f4f6] hover:text-[#ff4d5a] hover:border-[#ff4d5a] transition-all cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && viewMode === 'live' && (
        <div
          id="mobile-nav-drawer"
          className="xl:hidden absolute top-full left-0 right-0 z-50 bg-[#131317]/95 backdrop-blur-xl border-b border-[#35353b] p-4 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Mobile Stat Cards */}
          <div className="grid grid-cols-2 gap-2.5 pb-2 border-b border-[#26262c]">
            <div className="panel red p-3 rounded-xl flex items-center gap-2">
              <Wallet size={20} className="text-[#ff4d5a] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#9a9aa3] block truncate font-sans">
                  Remaining Budget
                </span>
                <span className="text-base font-bold text-[#ff4d5a] block truncate font-['Rajdhani',sans-serif]">
                  {displayBudget}
                </span>
              </div>
            </div>

            <div className="panel p-3 rounded-xl flex items-center gap-2">
              <Users size={18} className="text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#9a9aa3] block truncate font-sans">
                  Registered Teams
                </span>
                <span className="text-base font-bold text-white block truncate font-['Rajdhani',sans-serif]">
                  {displayTeams} Teams
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links with large 48px touch targets */}
          <div className="flex flex-col gap-1.5">
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
                  className={`w-full min-h-[48px] px-4 rounded-xl flex items-center gap-3 text-sm font-bold tracking-wide transition-all cursor-pointer font-['Rajdhani',sans-serif] ${
                    active && link.isLive
                      ? 'bg-[linear-gradient(#45141b,#2a0c11)] text-[#ff4a56] border border-[#a6212c] shadow-[0_0_12px_rgba(232,33,46,0.3)]'
                      : 'bg-[#18181c] text-[#f4f4f6] border border-[#2c2c33] hover:bg-[#222228] hover:border-[#3e3e48]'
                  }`}
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                    style={{ color: active && link.isLive ? '#ff4a56' : '#9a9aa3' }}
                  />
                  <span className="uppercase text-sm">{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
