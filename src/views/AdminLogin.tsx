import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';

export default function AdminLogin() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        showToast(signInError.message, 'error');
        setLoading(false);
        return;
      }

      if (!data?.user) {
        throw new Error('No user returned from authentication.');
      }

      // Check or ensure admin role in profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profileData) {
        // Auto-initialize profile as admin if missing
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: 'admin',
          is_active: true,
        });
      } else if (profileData.role !== 'admin') {
        setError('Access denied: Your account is registered, but does not have administrator privileges.');
        showToast('Access denied: Not an administrator.', 'error');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      showToast('Admin signed in successfully!', 'success');
      navigate('/123456789/GCL-0321/admin');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
      showToast('Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim() || 'Admin',
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        // If user already registered, try signing in with the provided password and promote to admin
        if (signUpError.message.toLowerCase().includes('already registered')) {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (loginError) {
            setError('This email is already registered. If it is yours, please switch to Sign In or enter the correct password.');
            showToast('User already exists.', 'error');
            setLoading(false);
            return;
          }

          if (loginData?.user) {
            // Update profile to admin
            await supabase.from('profiles').upsert({
              id: loginData.user.id,
              email: loginData.user.email,
              full_name: fullName.trim() || loginData.user.email?.split('@')[0] || 'Admin',
              role: 'admin',
              is_active: true,
            });

            showToast('Existing user promoted to Admin and logged in!', 'success');
            navigate('/123456789/GCL-0321/admin');
            return;
          }
        }

        setError(signUpError.message);
        showToast(signUpError.message, 'error');
        setLoading(false);
        return;
      }

      if (signUpData?.user) {
        // Ensure profile has role = 'admin'
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: signUpData.user.email,
          full_name: fullName.trim() || email.split('@')[0],
          role: 'admin',
          is_active: true,
        });

        showToast('Admin account created successfully!', 'success');
        navigate('/123456789/GCL-0321/admin');
      } else {
        showToast('Verification email sent or account created. Please sign in.', 'success');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to setup admin account.');
      showToast('Setup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Header viewMode="admin" onToggleView={() => navigate('/')} />
      <Notification notification={notification} />

      <div className="auth-centered-wrapper">
        <div className="auth-card max-w-md w-full">
          <div className="auth-icon-badge">
            <Lock size={36} className="text-red-400" />
          </div>
          <h1 className="auth-title">Administrator Portal</h1>
          <p className="auth-subtitle">
            Authenticated access for GenCode League event management.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus size={15} /> Set Admin Credentials
            </button>
          </div>

          {mode === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="admin@example.com"
                  className="gcl-input w-full"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  className={`gcl-input w-full ${error ? 'border-red-500' : ''}`}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-login-submit w-full mt-2">
                <ShieldCheck size={18} /> {loading ? 'Signing in...' : 'Sign In as Admin'}
              </button>
            </form>
          ) : (
            /* Register / Set Admin Credentials Form */
            <form onSubmit={handleRegisterAdmin} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Admin Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Lead Administrator"
                  className="gcl-input w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="admin@yourorganization.com"
                  className="gcl-input w-full"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Set Admin Password (Min 6 chars)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Create secure password"
                  className="gcl-input w-full"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Repeat your password"
                  className={`gcl-input w-full ${confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold font-mono text-sm tracking-wider uppercase bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <KeyRound size={18} /> {loading ? 'Configuring Account...' : 'Set Admin Credentials'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
