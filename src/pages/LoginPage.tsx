import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/database';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [usn, setUsn] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('participant');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message || 'Authentication failed. Please verify credentials.');
        } else {
          navigate(redirectPath, { replace: true });
        }
      } else {
        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              college,
              department,
              usn,
              role: selectedRole,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (data?.user) {
          // Update profile in profiles table with additional metadata
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            college,
            department,
            usn,
            role: selectedRole,
            is_active: true,
          });

          setSuccessMessage('Registration successful! Signing in to tournament portal...');
          // Attempt sign in immediately
          const { error: signInErr } = await signIn(email, password);
          if (!signInErr) {
            setTimeout(() => navigate(redirectPath, { replace: true }), 800);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
          <Badge variant="gold">GCL ACCESS PORTAL</Badge>
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {mode === 'signin' ? 'Sign In to GCL' : 'Register Competitor Account'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          {mode === 'signin'
            ? 'Access your squad dashboard, round evaluation, and competition telemetry.'
            : 'Create your official tournament credential to join or captain a squad.'}
        </p>
      </div>

      <div className="gcl-card" style={{ padding: '2rem' }}>
        {/* Mode Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              background: mode === 'signin' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'signin' ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              background: mode === 'signup' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'signup' ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Register
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--status-eliminated-bg)',
              border: '1px solid var(--status-eliminated-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-eliminated)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--status-qualified-bg)',
              border: '1px solid var(--status-qualified-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-qualified)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">College / Institution</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Institute of Technology"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="CSE / IT"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">USN / Roll No.</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="1XX20CS..."
                    value={usn}
                    onChange={(e) => setUsn(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Role Designation</label>
                <select
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  <option value="participant">Participant (Squad Member)</option>
                  <option value="captain">Team Captain (Bidding & Certificates)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="competitor@domain.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            isLoading={isLoading}
          >
            {mode === 'signin' ? 'Sign In' : 'Complete Registration'}
          </Button>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        By authenticating, you agree to the{' '}
        <Link to="/rules" style={{ color: 'var(--gold)' }}>
          League Rules
        </Link>{' '}
        and{' '}
        <Link to="/terms" style={{ color: 'var(--gold)' }}>
          Terms
        </Link>
        .
      </div>
    </div>
  );
}
