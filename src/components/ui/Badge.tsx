import type { ReactNode } from 'react';

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
  | 'subtle';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}

export function Badge({ variant = 'subtle', children, pulse = false, className = '' }: BadgeProps) {
  return (
    <span className={`gcl-badge ${variant} ${className}`}>
      {pulse && <span className="pulse-dot" />}
      {children}
    </span>
  );
}
