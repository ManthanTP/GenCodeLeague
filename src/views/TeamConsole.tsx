import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wallet, Trophy, Hammer, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import LiveTeamStatus from '../components/LiveTeamStatus';
import { formatCurrency } from '../utils/formatters';

export default function TeamConsole() {
  const { profile, loading: authLoading } = useAuth();
  const { eventState, edition, loading: stateLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const navigate = useNavigate();

  const [itemsCount, setItemsCount] = useState(0);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'team_leader')) {
      navigate('/team-login');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    if (profile?.team_id && edition?.id) {
      // Fetch owned items count
      supabase
        .from('team_items')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', profile.team_id)
        .eq('edition_id', edition.id)
        .then(({ count }) => setItemsCount(count || 0));
    }
  }, [profile, edition]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading || stateLoading) {
    return (
      <div className="gcl-loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Team Console...</p>
      </div>
    );
  }

  const myTeam = teams.find(t => t.id === profile?.team_id);

  if (!myTeam || !eventState || !edition) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="admin-card max-w-md w-full space-y-4">
          <h2 className="text-xl font-bold text-red-400">Team Profile Not Found</h2>
          <p className="text-slate-400 text-sm">
            Your account is not linked to any active team in this edition. Please contact event administrators.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-modal-cancel w-full"
          >
            Return to Live View
          </button>
        </div>
      </div>
    );
  }

  const isOutOfBudget = myTeam.budget <= 0;
  const isLowBudget = !isOutOfBudget && myTeam.budget <= 5000000;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Header
        viewMode="team"
        onToggleView={() => navigate('/')}
        isAdminAuthenticated={false}
        onLogout={handleLogout}
      />
      
      <div className="live-page-container max-w-5xl mx-auto space-y-8">
        {/* Team Leader Banner */}
        <div className="admin-card border-blue-500/30 bg-gradient-to-br from-slate-900 via-blue-950/20 to-slate-900 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Shield size={24} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold block">
                  TEAM LEADER DASHBOARD
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
                  {myTeam.name}
                  {isOutOfBudget && (
                    <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                  )}
                  {isLowBudget && (
                    <span className="badge-low-budget">⚠️ LOW BUDGET</span>
                  )}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                Team Score: <strong className="text-yellow-400 text-base">★ {myTeam.score || 0}</strong>
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 shrink-0">
                <Wallet size={24} />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">REMAINING BUDGET</div>
                <div className={`text-2xl font-black font-mono ${isOutOfBudget ? 'text-red-500' : 'text-green-400'}`}>
                  {formatCurrency(myTeam.budget)}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Trophy size={24} />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">ITEMS ACQUIRED</div>
                <div className="text-2xl font-black font-mono text-indigo-300">
                  {itemsCount} <span className="text-sm font-normal text-slate-400">items</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live event view below */}
        {eventState.game_state === 'active' && (
          <div className="admin-card text-center border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/10 to-slate-900 py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-full text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <Hammer size={14} /> LIVE AUCTION ROUND {eventState.current_round_index + 1}
            </div>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              The live auction is underway. Watch the main projector screen or live scoreboard for real-time bid calls.
            </p>
          </div>
        )}

        <LiveTeamStatus teams={teams} startingBudget={edition.starting_budget} myTeamId={myTeam.id} />
      </div>
    </div>
  );
}
