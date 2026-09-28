import { Hammer, Users, Eye, LogOut, Zap, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

        {/* Center: Context Info */}
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

              <nav className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400">
                <button
                  type="button"
                  onClick={() => navigate('/hall-of-fame')}
                  className="hover:text-yellow-400 transition-colors"
                >
                  Hall of Fame
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/my-certificates')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Certificates
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/gallery')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Gallery
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/announcements')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Announcements
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/faq')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  FAQ
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Stats and Controls */}
        <div className="gcl-header-actions">
          <div className="gcl-stats-group">
            <div className="header-stat-pill stat-pill-spent">
              <span className="stat-pill-icon">▼</span>
              <div>
                <p className="stat-label">Spent</p>
                <p className="stat-value-spent">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
            <div className="header-stat-pill stat-pill-available">
              <span className="stat-pill-icon">▲</span>
              <div>
                <p className="stat-label">Available</p>
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
          </div>
        </div>
      </div>
    </header>
  );
}
