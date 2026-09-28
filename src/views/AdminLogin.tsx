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
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        showToast(signInError.message, 'error');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('gcl_admin_authenticated', 'true');
      showToast('Admin logged in successfully!', 'success');
      navigate('/123456789/GCL-0321/admin');
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
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
        <div className="auth-card">
          <div className="auth-icon-badge">
            <Lock size={40} className="text-red-400" />
          </div>
          <h1 className="auth-title">Admin Access Required</h1>
          <p className="auth-subtitle">
            Enter your admin credentials to access the auction control panel.
          </p>

          <form onSubmit={handleSupabaseLogin} className="space-y-4">
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
                placeholder="Enter Password"
                className={`gcl-input w-full ${error ? 'border-red-500' : ''}`}
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm font-medium">{error}</div>}

            <button type="submit" disabled={loading} className="btn-login-submit">
              <ShieldCheck size={20} /> {loading ? 'Logging in...' : 'Sign In with Supabase'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
