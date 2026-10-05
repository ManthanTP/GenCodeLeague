import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { supabase } from '../lib/supabase';
import './Header.css';

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
  totalAvailable: propTotalAvailable,
  teamCount: propTeamCount,
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
  const [directStats, setDirectStats] = useState<{ count: number; budget: number } | null>(null);

  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Hook into active event state & teams for global stats
  const { edition } = useEventState();
  const { teams } = useTeams(edition?.id);

  // Fetch active tournament stats if not provided and not yet loaded
  useEffect(() => {
    const hasProps =
      typeof propTotalAvailable === 'number' &&
      propTotalAvailable > 0 &&
      typeof propTeamCount === 'number' &&
      propTeamCount > 0;
    if (hasProps) return;

    let isCancelled = false;
    async function fetchActiveStats() {
      try {
        const { data: edData } = await supabase
          .from('editions')
          .select('id')
          .eq('is_current', true)
          .single();

        if (edData?.id && !isCancelled) {
          const { data: tData } = await supabase
            .from('teams')
            .select('budget')
            .eq('edition_id', edData.id);

          if (tData && tData.length > 0 && !isCancelled) {
            const sum = tData.reduce((acc, t) => acc + (t.budget || 0), 0);
            setDirectStats({ count: tData.length, budget: sum });
          }
        }
      } catch (e) {
        console.warn('Failed to load active stats in header', e);
      }
    }

    if (!directStats && (!teams || teams.length === 0)) {
      fetchActiveStats();
    }

    return () => {
      isCancelled = true;
    };
  }, [edition?.id, propTotalAvailable, propTeamCount, directStats, teams]);

  const effectiveBudget = useMemo(() => {
    if (typeof propTotalAvailable === 'number' && propTotalAvailable > 0) {
      return propTotalAvailable;
    }
    if (teams && teams.length > 0) {
      const b = teams.reduce((acc, t) => acc + (t.budget || 0), 0);
      if (b > 0) return b;
    }
    if (directStats && directStats.budget > 0) {
      return directStats.budget;
    }
    try {
      const cached = localStorage.getItem('gcl_cached_teams');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const b = parsed.reduce((acc: number, t: { budget?: number }) => acc + (t.budget || 0), 0);
          if (b > 0) return b;
        }
      }
    } catch {}
    return 0;
  }, [propTotalAvailable, teams, directStats]);

  const effectiveTeamCount = useMemo(() => {
    if (typeof propTeamCount === 'number' && propTeamCount > 0) {
      return propTeamCount;
    }
    if (teams && teams.length > 0) {
      return teams.length;
    }
    if (directStats && directStats.count > 0) {
      return directStats.count;
    }
    try {
      const cached = localStorage.getItem('gcl_cached_teams');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.length;
        }
      }
    } catch {}
    return 0;
  }, [propTeamCount, teams, directStats]);

  // Nav links: Teams removed per specification
  const navLinks = [
    { label: 'Live', path: '/', altPath: '/live', icon: Radio },
    { label: 'Hall of Fame', path: '/hall-of-fame', icon: Star },
    { label: 'Certificates', path: '/my-certificates', icon: Award },
    { label: 'Gallery', path: '/gallery', icon: ImageIcon },
    { label: 'Updates', path: '/announcements', icon: Megaphone },
    { label: 'FAQ', path: '/faq', icon: HelpCircle },
  ];

  // Prefix matching for child routes: exactly one pill active at a time
  const isLinkActive = (label: string) => {
    const current = location.pathname;
    switch (label) {
      case 'Live':
        return current === '/' || current === '/live';
      case 'Hall of Fame':
        return current === '/hall-of-fame' || current.startsWith('/hall-of-fame/') || current.startsWith('/editions/');
      case 'Certificates':
        return current === '/my-certificates' || current.startsWith('/my-certificates/') || current.startsWith('/verify/');
      case 'Gallery':
        return current === '/gallery' || current.startsWith('/gallery/');
      case 'Updates':
        return current === '/announcements' || current.startsWith('/announcements/');
      case 'FAQ':
        return current === '/faq' || current.startsWith('/faq/');
      default:
        return false;
    }
  };

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll, trap focus, handle Escape key, and restore focus on drawer close
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        const closeBtn = drawerRef.current?.querySelector<HTMLButtonElement>('.gcl-drawer-close-btn');
        closeBtn?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
          hamburgerRef.current?.focus();
          return;
        }

        if (e.key === 'Tab' && drawerRef.current) {
          const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;
          const firstElement = focusables[0];
          const lastElement = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const closeMenuAndRestoreFocus = () => {
    setMobileMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  const displayBudget = formatCurrency(effectiveBudget);
  const displayTeams = effectiveTeamCount;

  return (
    <header className="gcl-header-glass" style={{ width: '100%', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
      <div
        style={{
          width: '100%',
          padding: '0 clamp(10px, 2vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'clamp(6px, 1.5vw, 1rem)',
          height: '100%',
        }}
      >
        {/* Brand identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(4px, 1vw, 0.65rem)',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onClick={() => navigate('/')}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-2px', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 72px)', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>
            <span style={{ color: '#fff' }}>GC</span>
            <span style={{ color: '#e8212e' }}>L</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #35353b', paddingLeft: 'clamp(6px, 1vw, 0.75rem)', marginLeft: 'clamp(2px, 0.5vw, 0.2rem)' }}>
            <span
              className="gcl-header-brand-subline"
              style={{ fontSize: 'clamp(12px, 1.5vw, 22px)', fontWeight: 600, letterSpacing: '0.3px', color: '#f4f4f6', textTransform: 'uppercase', lineHeight: 1.15, fontFamily: "'Rajdhani', sans-serif" }}
            >
              GEN CODE LEAGUE
            </span>
            <span style={{ fontSize: 'clamp(9px, 1vw, 14px)', fontWeight: 500, letterSpacing: '0.2px', color: '#9a9aa3', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e8212e' }} />
              LIVE AUCTION
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Pills (Visible on >= 1024px) */}
        {!isFullscreen && (
          <div className="hidden lg:flex items-center gap-2">
            {viewMode === 'admin' && (
              <div className="header-role-badge header-role-admin">
                <Shield size={18} />
                <span>ADMIN</span>
              </div>
            )}

            {viewMode === 'live' && (
              <nav className="gcl-desktop-nav-wrap" aria-label="Main Navigation">
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  const active = isLinkActive(link.label);

                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => navigate(link.path)}
                      className={`gcl-nav-pill ${active ? 'active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <IconComponent size={18} />
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

        {/* Right Stats & Mobile Controls Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.2vw, 0.75rem)', flexShrink: 0 }}>
          {/* Mobile/Tablet Compact Budget Pill (Shown < 1024px) */}
          <div className="gcl-header-budget-mobile flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181c] border border-[#2c2c33]">
            <Wallet size={14} className="text-[#ff4350] shrink-0" />
            <span className="text-xs font-bold text-[#ff4350] font-['Rajdhani',sans-serif] font-mono whitespace-nowrap">
              {displayBudget}
            </span>
          </div>

          {/* Desktop Stat Cards (Shown >= 1024px) */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Remaining Budget glass card */}
            <div className="panel red gcl-header-budget-desktop" style={{ minWidth: '150px', width: 'auto', height: '64px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Wallet size={30} style={{ strokeWidth: 2.2, color: '#f4f4f6', flexShrink: 0 }} />
              <div style={{ whiteSpace: 'nowrap' }}>
                <p className="gcl-header-budget-label" style={{ fontSize: '13px', color: '#b5b5bd', fontWeight: 400, margin: 0, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                  Remaining Budget
                </p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#ff4350', margin: '0.15rem 0 0 0', lineHeight: 1, fontFamily: "'Rajdhani', sans-serif", fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {displayBudget}
                </p>
              </div>
            </div>

            {/* Total Teams glass card */}
            <div className="panel gcl-header-teams-chip" style={{ minWidth: '130px', width: 'auto', height: '64px', borderRadius: '10px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
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

          {/* Mobile hamburger button (44x44px, < 1024px) */}
          {!isFullscreen && viewMode === 'live' && (
            <button
              ref={hamburgerRef}
              type="button"
              className="gcl-header-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <div
        className={`gcl-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMenuAndRestoreFocus}
        aria-hidden="true"
      />

      {/* Mobile Sliding Drawer Panel */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`gcl-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}
      >
        {/* Top row inside drawer */}
        <div className="gcl-drawer-top">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              letterSpacing: '-1.5px',
              fontWeight: 700,
              fontSize: '32px',
              lineHeight: 1,
              fontFamily: "'Rajdhani', sans-serif",
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => {
              navigate('/');
              closeMenuAndRestoreFocus();
            }}
          >
            <span style={{ color: '#fff' }}>GC</span>
            <span style={{ color: '#e8212e' }}>L</span>
          </div>

          <button
            type="button"
            className="gcl-drawer-close-btn"
            onClick={closeMenuAndRestoreFocus}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="gcl-drawer-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.label);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  navigate(link.path);
                  closeMenuAndRestoreFocus();
                }}
                className={`gcl-drawer-row ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <div className="gcl-drawer-row-left">
                  <div className="gcl-drawer-icon-tile">
                    <Icon size={18} />
                  </div>
                  <span className="gcl-drawer-label">{link.label}</span>
                </div>
                <ChevronRight size={16} className="gcl-drawer-chevron" />
              </button>
            );
          })}
        </nav>

        {/* Bottom pinned stat tiles */}
        <div className="gcl-drawer-bottom">
          <div className="gcl-drawer-stat-tile">
            <div className="gcl-drawer-stat-title">
              <Wallet size={13} className="text-[#ff4350]" />
              <span>Remaining Budget</span>
            </div>
            <div className="gcl-drawer-stat-val text-[#ff4350]">
              {displayBudget}
            </div>
          </div>

          <div className="gcl-drawer-stat-tile">
            <div className="gcl-drawer-stat-title">
              <Users size={13} className="text-[#f4f4f6]" />
              <span>Total Teams</span>
            </div>
            <div className="gcl-drawer-stat-val text-[#f4f4f6]">
              {displayTeams}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
