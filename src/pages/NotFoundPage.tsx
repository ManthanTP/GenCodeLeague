import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div
      className="container"
      style={{
        padding: '6rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '5rem',
          fontWeight: 900,
          color: 'var(--border-default)',
          lineHeight: 1,
          marginBottom: '1rem',
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Resource Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '2rem', lineHeight: 1.6 }}>
        The requested competition page or resource route does not exist within the Gen Code League digital perimeter.
      </p>
      <Link to="/">
        <Button variant="primary">Return to League Headquarters</Button>
      </Link>
    </div>
  );
}
