export function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const px = size === 'sm' ? '16px' : size === 'lg' ? '36px' : '24px';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.75rem' }}>
      <div
        style={{
          width: px,
          height: px,
          border: '2px solid var(--border-default)',
          borderTopColor: 'var(--gold)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      {text && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
