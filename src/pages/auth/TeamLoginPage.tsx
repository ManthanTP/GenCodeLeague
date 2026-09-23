import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
      ? 'Only registered Team Leaders with an assigned team may access the Team Portal.'
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
        setErrorMessage(error.message || 'Invalid credentials. Please verify your email and password.');
        setIsLoading(false);
        return;
      }

      // Check current user session and team assignment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage('Session initialization failed. Please try again.');
        setIsLoading(false);
        return;
      }

      await Promise.all([refreshProfile(), refreshTeam()]);

      // Check if user has an assigned team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, status, edition:editions(name, year)')
        .or(`team_leader_id.eq.${user.id},captain_id.eq.${user.id}`)
        .maybeSingle();

      if (!teamData) {
        // Check if admin
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
          'Authentication successful, but this account has not been assigned to a team yet. Please contact tournament admins.'
        );
        setIsLoading(false);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
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
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
            <Badge variant="live" pulse>
              TEAM LEADER PORTAL
            </Badge>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Team Leader Sign In
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Official competition console for verified Team Leaders. Manage team members, enter live rounds, and track scoring.
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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="leader-email">
              Leader Email Address
            </label>
            <input
              id="leader-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="leader@institution.edu"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="leader-password">
              Password
            </label>
            <input
              id="leader-password"
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
            {isLoading ? 'Verifying Team Credentials...' : 'Authenticate & Enter Portal'}
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
            Tournament Administrator?{' '}
            <Link to="/admin/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>
              Admin Console Sign In &rarr;
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
