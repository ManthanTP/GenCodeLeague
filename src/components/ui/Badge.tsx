import type { CSSProperties, ReactNode } from 'react';

export type BadgeVariant =
  | 'live'
  | 'qualified'
  | 'eliminated'
  | 'finalist'
  | 'winner'
  | 'draft'
  | 'active'
  | 'revoked'
  | 'gold'
  | 'subtle'
  | 'warning'
  | 'danger'
  | 'correct'
  | 'incorrect'
  | 'round'
  | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ variant = 'subtle', children, pulse = false, className = '', style }: BadgeProps) {
  // Build inline overrides for variants not covered by the pure CSS classes
  const extraStyle: CSSProperties =
    variant === 'warning'
      ? { background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.3)' }
    : variant === 'danger'
      ? { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }
    : variant === 'gold' || variant === 'primary'
      ? { background: 'rgba(34, 211, 238, 0.12)', color: '#22D3EE', border: '1px solid rgba(34, 211, 238, 0.3)' }
    : variant === 'qualified' || variant === 'winner' || variant === 'active'
      ? { background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }
    : variant === 'eliminated' || variant === 'revoked'
      ? { background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
    : variant === 'finalist'
      ? { background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.3)' }
    : variant === 'draft'
      ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
    : variant === 'round'
      ? { background: 'rgba(37, 99, 235, 0.15)', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.3)' }
    : {};

  return (
    <span className={`gcl-badge ${variant} ${className}`} style={{ ...extraStyle, ...style }}>
      {pulse && <span className="pulse-dot" />}
      {children}
    </span>
  );
}
