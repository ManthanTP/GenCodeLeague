import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';

import '../admin.css';

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
    <div className="admin-shell">
      <Header viewMode="admin" onToggleView={() => navigate('/live')} />
      <Notification notification={notification} />

      <div className="admin-content-wrap flex items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="admin-card max-w-md w-full mx-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#261014] border border-[#ff2a3d]/40 flex items-center justify-center text-[#ff4d5a] mx-auto mb-3 shadow-[0_0_20px_rgba(255,42,61,0.25)]">
              <Lock size={28} />
            </div>
            <h1 className="admin-hero-title text-2xl mb-1">Administrator Portal</h1>
            <p className="admin-hero-desc text-xs text-[#8e8e9a]">
              Enter your admin credentials to access the auction console.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs text-[#8e8e9a] uppercase font-bold mb-1.5 block font-mono">
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
              <label className="text-xs text-[#8e8e9a] uppercase font-bold mb-1.5 block font-mono">
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
                className={`gcl-input w-full ${error ? 'border-[#ff2a3d]' : ''}`}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs leading-relaxed font-sans">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="admin-btn-primary w-full mt-2">
              <ShieldCheck size={18} /> {loading ? 'Signing in...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
