import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signIn, refreshProfile, refreshTeam } = useAuth();
  const navigate = useNavigate();

  async function handleUnifiedLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMessage(error.message || 'Authentication failed. Please check credentials.');
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

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        navigate(redirectPath || '/admin/dashboard', { replace: true });
        return;
      }

      // Check team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .or(`team_leader_id.eq.${user.id},captain_id.eq.${user.id}`)
        .maybeSingle();

      if (teamData) {
        navigate(redirectPath || '/team/dashboard', { replace: true });
        return;
      }

      // Default redirect
      navigate(redirectPath || '/team/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
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
      <div style={{ maxWidth: '860px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
            <Badge variant="gold">GCL ACCESS PORTAL</Badge>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Choose Your Access Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '500px', margin: '0 auto' }}>
            Gen Code League authenticates Team Leaders and Tournament Directors through dedicated operational consoles.
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Team Leader Card */}
          <div
            className="card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-default)',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🛡️</span>
                <Badge variant="live">COMPETITOR</Badge>
              </div>
              <h2 style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                Team Leader Portal
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Designated interface for team leaders. Manage your member records, observe live auctions, submit official round answers, and view team standings.
              </p>
            </div>
            <Link to="/team/login" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="md" style={{ width: '100%', borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                Team Leader Login &rarr;
              </Button>
            </Link>
          </div>

          {/* Admin Console Card */}
          <div
            className="card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-gold)',
              background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 17, 24, 0.9) 100%)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>⚡</span>
                <Badge variant="gold">OPERATIONS</Badge>
              </div>
              <h2 style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                Master Admin Console
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Administrative control over tournament editions, team assignments, auction operations, live timers, scoreboard, and ceremony podium reveal.
              </p>
            </div>
            <Link to="/admin/login" style={{ textDecoration: 'none' }}>
              <Button variant="gold" size="md" style={{ width: '100%' }}>
                Admin Console Sign In &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Sign-in Accordion / Direct Form */}
        <div
          className="card"
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            padding: '2rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>
            Direct Quick Sign-In
          </h3>

          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUnifiedLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="unified-email">
                Email
              </label>
              <input
                id="unified-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="unified-password">
                Password
              </label>
              <input
                id="unified-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <Button type="submit" variant="secondary" size="md" isLoading={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Authenticating...' : 'Sign In & Auto-Route'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
