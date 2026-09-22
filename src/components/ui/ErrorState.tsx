import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        background: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--status-eliminated-border)',
        margin: '1.5rem 0',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--status-eliminated-bg)',
          color: 'var(--status-eliminated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          fontSize: '1.25rem',
          fontWeight: 'bold',
        }}
      >
        !
      </div>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ maxWidth: '440px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: onRetry ? '1.25rem' : '0' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
