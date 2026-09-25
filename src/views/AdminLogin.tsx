import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import { ADMIN_MASTER_PASSWORD } from '../data/roundsData';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('manthantp0321@gmail.com');
  const [useEmailAuth, setUseEmailAuth] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePasswordGate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check master password
    if (password === ADMIN_MASTER_PASSWORD) {
      sessionStorage.setItem('gcl_admin_authenticated', 'true');
      showToast('Admin access granted!', 'success');
      setTimeout(() => navigate('/123456789/GCL-0321/admin'), 400);
      return;
    }

    if (!useEmailAuth) {
      setError('Incorrect admin password. (Try GCLauction@0321 or click Supabase Login)');
      setPassword('');
      showToast('Access denied.', 'error');
    }
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        // Fallback: check master password
        if (password === ADMIN_MASTER_PASSWORD) {
          sessionStorage.setItem('gcl_admin_authenticated', 'true');
          showToast('Master admin authenticated!', 'success');
          navigate('/123456789/GCL-0321/admin');
          return;
        }
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // If user is manthantp0321@gmail.com or role is admin, grant access
      sessionStorage.setItem('gcl_admin_authenticated', 'true');
      showToast('Admin logged in successfully!', 'success');
      navigate('/123456789/GCL-0321/admin');
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Header viewMode="admin" onToggleView={() => navigate('/')} />
      <Notification notification={notification} />

      <div className="auth-centered-wrapper">
        <div className="auth-card">
          <div className="auth-icon-badge">
            <Lock size={40} className="text-red-400" />
          </div>
          <h1 className="auth-title">Admin Access Required</h1>
          <p className="auth-subtitle">
            Enter the admin password to access the auction control panel.
          </p>

          {!useEmailAuth ? (
            <form onSubmit={handlePasswordGate} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter Admin Password"
                  className={`gcl-input w-full font-mono text-lg ${
                    error ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />
              </div>

              {error && <div className="text-red-400 text-sm font-medium">{error}</div>}

              <button type="submit" className="btn-login-submit">
                <Unlock size={20} /> Log In to Admin Console
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setUseEmailAuth(true)}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Or sign in with Supabase Email Credentials →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSupabaseLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="gcl-input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="gcl-input w-full"
                  required
                />
              </div>

              {error && <div className="text-red-400 text-sm font-medium">{error}</div>}

              <button type="submit" disabled={loading} className="btn-login-submit">
                <ShieldCheck size={20} /> {loading ? 'Logging in...' : 'Sign In with Supabase'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setUseEmailAuth(false)}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  ← Back to Quick Admin Password Gate
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
