import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';

export function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized'
      ? 'Access denied. The specified account does not possess administrator privileges.'
      : null
  );

  const { signIn, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMessage(error.message || 'Invalid administrator credentials.');
        setIsLoading(false);
        return;
      }

      // Check current user session and admin status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Session initialization failed.');
        setIsLoading(false);
        return;
      }

      await refreshProfile();

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        // Revoke unauthorized session
        await signOut();
        setErrorMessage('Unauthorized: This portal is strictly restricted to GCL administrators.');
        setIsLoading(false);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during admin authentication.');
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-gold)',
          boxShadow: 'var(--shadow-gold)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
            <Badge variant="gold">ADMINISTRATIVE ACCESS</Badge>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            GCL Master Admin
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Authorized command console for tournament directors, auctioneers, and competition stewards.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gcl.org"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="gold" size="lg" isLoading={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {isLoading ? 'Verifying Admin Authority...' : 'Authorize & Open Console'}
          </Button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Team Leader?{' '}
            <Link to="/team/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>
              Team Portal Sign In &rarr;
            </Link>
          </div>
          <div>
            <Link to="/" style={{ color: 'var(--text-secondary)' }}>
              &larr; Return to Public Tournament Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
