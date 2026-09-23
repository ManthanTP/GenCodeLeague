import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
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
      ? 'Access denied. This account does not have administrator privileges.'
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
        await signOut();
        setErrorMessage('Unauthorized: This portal is restricted to GCL administrators.');
        setIsLoading(false);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-elevated)',
          textAlign: 'center',
        }}
      >
        {/* Lock Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '1.5rem',
          }}
        >
          🔒
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}
        >
          Admin Access Required
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}
        >
          Enter the password to access the auction control panel.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
              textAlign: 'left',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            id="admin-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin Email"
            required
            autoComplete="email"
            style={{ textAlign: 'center' }}
          />

          <input
            id="admin-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Admin Password"
            required
            autoComplete="current-password"
            style={{ textAlign: 'center' }}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            fullWidth
          >
            {isLoading ? 'Verifying...' : '🔒 Log In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
