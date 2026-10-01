import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setError('Access denied: Your account does not have administrator privileges.');
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
            Enter your admin credentials to access the auction console.
          </p>

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
        </div>
      </div>
    </div>
  );
}
