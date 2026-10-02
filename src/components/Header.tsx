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

  // Formatted values with mockup matching defaults
  const displayBudget = totalAvailable > 0 ? formatCurrency(totalAvailable) : '₹34.20 Cr';
  const displayTeams = teamCount > 0 ? teamCount : 8;

  return (
    <header className="w-full bg-[#0c0d12] border-b border-[#1c1d25] sticky top-0 z-50">
      <div className="w-full max-w-[1720px] mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand identity: GCL bold stylized */}
        <div
          className="flex items-center gap-3 cursor-pointer group select-none flex-shrink-0"
          onClick={() => navigate('/')}
        >
          <div className="flex items-baseline tracking-tighter font-black text-2xl lg:text-3xl leading-none">
            <span className="text-white font-black">GC</span>
            <span className="text-[#e0263f] font-black">L</span>
          </div>
          <div className="flex flex-col border-l border-[#272832] pl-3 py-0.5">
            <span className="text-xs font-black tracking-widest text-white uppercase leading-none font-sans">
              GENCODE LEAGUE
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 flex items-center gap-1.5 uppercase mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e0263f] shadow-[0_0_8px_#e0263f] animate-pulse"></span>
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Navigation Pills */}
        <div className="hidden xl:flex items-center gap-2">
          {viewMode === 'admin' && (
            <div className="header-role-badge header-role-admin">
              <Shield size={14} />
              <span>ADMIN</span>
            </div>
          )}

          {viewMode === 'live' && (
            <nav className="flex items-center gap-1.5 bg-[#121319] border border-[#22232d] p-1 rounded-xl">
              {navLinks.map((link) => {
                const IconComponent = link.icon;
                const active = isLinkActive(link.path, link.altPath);

                if (link.isLive) {
                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => handleNavClick(link.path)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        active
                          ? 'border border-[#e0263f] bg-red-950/30 text-white shadow-[0_0_12px_rgba(224,38,63,0.35)]'
                          : 'text-slate-300 hover:text-white hover:bg-[#1a1b24]'
                      }`}
                    >
                      <IconComponent size={14} className={active ? 'text-[#e0263f] animate-pulse' : 'text-slate-400'} />
                      <span>{link.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNavClick(link.path)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-[#22232f] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1b24]'
                    }`}
                  >
                    <IconComponent size={13} className="text-slate-400" />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Stats Section */}
        <div className="flex items-center gap-3">
          {/* Remaining Budget card */}
          <div className="flex items-center gap-2.5 bg-[#121318] border border-red-500/30 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(224,38,63,0.12)]">
            <div className="p-1.5 rounded-lg bg-[#1a1b22] border border-[#282934] text-slate-300">
              <Wallet size={15} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Remaining Budget
              </p>
              <p className="text-sm font-black text-[#e0263f] font-mono leading-tight mt-0.5">
                {displayBudget}
              </p>
            </div>
          </div>

          {/* Total Teams card */}
          <div className="flex items-center gap-2.5 bg-[#121318] border border-[#252632] px-3.5 py-1.5 rounded-xl shadow-sm">
            <div className="p-1.5 rounded-lg bg-[#1a1b22] border border-[#282934] text-slate-300">
              <Users size={15} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Total Teams
              </p>
              <p className="text-sm font-black text-white font-mono leading-tight mt-0.5">
                {displayTeams}
              </p>
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

          {/* Mobile hamburger menu */}
          {viewMode === 'live' && (
            <button
              className="xl:hidden p-2 text-slate-400 hover:text-white"
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
        <div className="bg-[#0c0d12] border-b border-[#22232e] p-4 flex flex-col gap-2 xl:hidden">
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-red-950/40 text-white border border-[#e0263f]'
                    : 'text-slate-300 hover:text-white hover:bg-[#1a1b24]'
                }`}
              >
                <Icon size={16} className={active ? 'text-[#e0263f]' : 'text-slate-400'} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
