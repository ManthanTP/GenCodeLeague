import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

export function TeamLoginPage() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/team/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'no_team'
      ? 'This account has not been assigned to a team. Contact tournament admin.'
      : null
  );

  const { signIn, refreshTeam, refreshProfile } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMessage(error.message || 'Invalid credentials.');
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Session initialization failed.');
        setIsLoading(false);
        return;
      }

      await Promise.all([refreshProfile(), refreshTeam()]);

      // Check if user has an assigned team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .or(`team_leader_id.eq.${user.id},captain_id.eq.${user.id}`)
        .maybeSingle();

      if (!teamData) {
        // Check if admin — redirect silently
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          navigate('/admin/dashboard', { replace: true });
          return;
        }

        setErrorMessage(
          'Authentication successful, but no team is assigned to this account. Contact tournament admin.'
        );
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
        {/* Team Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(34, 211, 238, 0.12)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '1.5rem',
          }}
        >
          🛡️
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}
        >
          Team Leader Login
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}
        >
          Sign in with the credentials provided by tournament admin.
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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            id="leader-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Team Leader Email"
            required
            autoComplete="email"
          />

          <input
            id="leader-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
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

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <Link to="/" style={{ color: 'var(--text-secondary)' }}>
            ← Return to GCL Home
          </Link>
        </div>
      </div>
    </div>
  );
}
