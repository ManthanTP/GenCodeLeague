import { Hammer, Users, Eye, Lock, Unlock, LogOut } from 'lucide-react';
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
  return (
    <header className="gcl-header">
      <div className="gcl-header-inner">
        {/* Brand identity */}
        <div className="gcl-brand">
          <div className="brand-icon-wrapper">
            <div className="brand-icon-glow"></div>
            <div className="brand-icon-box">
              <Hammer size={24} className="text-cyan-400" />
            </div>
          </div>
          <div className="brand-text-col">
            <h1 className="brand-heading">
              GEN<span className="brand-heading-gradient">CODE</span>LEAGUE
            </h1>
            <div className="live-badge-row">
              <div className="live-dot"></div>
              <span className="live-subtext">Live Auction Dashboard</span>
            </div>
          </div>
        </div>

        {/* Stats and Controls */}
        <div className="gcl-header-actions">
          <div className="gcl-stats-group">
            <div className="stat-box text-right">
              <p className="stat-label">Total Spent</p>
              <p className="stat-value-spent">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="stat-box text-right">
              <p className="stat-label">Total Available</p>
              <p className="stat-value-available">{formatCurrency(totalAvailable)}</p>
            </div>
            <div className="stat-box text-right">
              <p className="stat-label">Teams</p>
              <p className="stat-value-teams">
                <Users size={16} /> {teamCount}
              </p>
            </div>
          </div>

          <div className="gcl-buttons-row">
            {onToggleView && (
              <button onClick={onToggleView} className="btn-header-view">
                {viewMode === 'admin' ? (
                  <>
                    <Eye size={18} /> Live View
                  </>
                ) : (
                  <>
                    {isAdminAuthenticated ? <Lock size={18} /> : <Unlock size={18} />} Admin Console
                  </>
                )}
              </button>
            )}

            {viewMode === 'admin' && isAdminAuthenticated && onLogout && (
              <button onClick={onLogout} className="btn-header-logout">
                <LogOut size={18} /> Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
