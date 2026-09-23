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
  | 'danger';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ variant = 'subtle', children, pulse = false, className = '', style }: BadgeProps) {
  const extraStyle: CSSProperties =
    variant === 'warning'
      ? { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
      : variant === 'danger'
      ? { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }
      : {};

  return (
    <span className={`gcl-badge ${variant} ${className}`} style={{ ...extraStyle, ...style }}>
      {pulse && <span className="pulse-dot" />}
      {children}
    </span>
  );
}
