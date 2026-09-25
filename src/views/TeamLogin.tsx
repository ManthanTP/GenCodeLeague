import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

export default function TeamLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role === 'team_leader') {
      navigate('/team');
    } else {
      setError('Access denied. Team Leader account required.');
      await supabase.auth.signOut();
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Header viewMode="team" onToggleView={() => navigate('/')} />
      
      <div className="auth-centered-wrapper">
        <div className="auth-card">
          <div className="auth-icon-badge bg-cyan-950/40 border-cyan-500/30">
            <Users size={38} className="text-cyan-400" />
          </div>
          <h1 className="auth-title">Team Leader Login</h1>
          <p className="auth-subtitle">
            Enter your team credentials to access your dashboard.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-1.5 block">
                Team Email
              </label>
              <input
                type="email"
                placeholder="team@gencodeleague.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gcl-input w-full"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gcl-input w-full"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm font-medium bg-red-950/40 p-2.5 rounded-lg border border-red-800/60">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-login-submit mt-2"
              disabled={loading}
            >
              <LogIn size={18} />
              {loading ? 'Authenticating...' : 'Log In to Team Console'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
