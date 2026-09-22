export function SkeletonLoader({
  count = 3,
  height = '48px',
  className = '',
}: {
  count?: number;
  height?: string;
  className?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }} className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            width: '100%',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            animation: 'pulseSkeleton 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulseSkeleton {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
