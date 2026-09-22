import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-default)',
        margin: '1.5rem 0',
      }}
    >
      {icon ? (
        <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{icon}</div>
      ) : (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: 'var(--text-muted)',
            fontSize: '1.25rem',
          }}
        >
          ∅
        </div>
      )}
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: actionText ? '1.5rem' : '0' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
