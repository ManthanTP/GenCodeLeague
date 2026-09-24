import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import LiveTeamStatus from '../components/LiveTeamStatus';

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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const myTeam = teams.find(t => t.id === profile?.team_id);

  if (!myTeam || !eventState || !edition) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Error: Team data not found.</div>;
  }

  return (
    <>
      <Header 
        rightContent={
          <>
            <button className="primary" onClick={() => window.open('/', '_blank')}>Live View</button>
            <button className="danger" onClick={handleLogout}>Logout</button>
          </>
        }
      />
      
      <div className="container">
        {/* Team Dashboard Panel */}
        <div className="card" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>MY TEAM DASHBOARD</div>
          <h2>{myTeam.name}</h2>
          
          <div className="flex gap-4 mt-4">
            <div style={{ flex: 1, backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BUDGET</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{myTeam.budget.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ITEMS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{itemsCount}</div>
            </div>
          </div>
        </div>

        {/* Live event view below */}
        {eventState.game_state === 'active' && (
          <div className="card text-center" style={{ borderColor: 'var(--warning)' }}>
            <div style={{ color: 'var(--warning)', letterSpacing: '2px', fontSize: '0.875rem' }}>
              ROUND {eventState.current_round_index} | QUESTION {eventState.current_question_index}
            </div>
            {/* Real timer would be here */}
            <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0' }}>Live Auction Active</div>
          </div>
        )}

        <LiveTeamStatus teams={teams} startingBudget={edition.starting_budget} />
      </div>
    </>
  );
}
