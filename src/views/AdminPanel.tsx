import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import Header from '../components/Header';
import { supabase } from '../lib/supabase';

import AdminSetup from './AdminSetup';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useAuth();
  const { eventState, edition, loading: stateLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'admin')) {
      navigate('/123456789/GCL@admin');
    }
  }, [profile, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading || stateLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!eventState || !edition) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Error: No active edition found. Please seed the database.</div>;
  }

  const renderContent = () => {
    switch (eventState.game_state) {
      case 'setup':
        return <AdminSetup edition={edition} eventState={eventState} teams={teams} />;
      case 'waiting_start':
        return <div>Waiting start placeholder</div>;
      case 'active':
        return <div>Active round placeholder</div>;
      case 'intermission':
        return <div>Intermission placeholder</div>;
      case 'winner_reveal':
        return <div>Winner Reveal placeholder</div>;
      default:
        return <div>Unknown game state</div>;
    }
  };

  return (
    <>
      <Header 
        rightContent={
          <>
            <div className="header-stats">
              <div className="stat-col">
                <span className="stat-label">TOTAL SPENT</span>
                {/* We'll calculate this from teams later */}
                <span className="stat-val danger">₹0</span>
              </div>
              <div className="stat-col">
                <span className="stat-label">TOTAL AVAILABLE</span>
                <span className="stat-val">₹{edition.starting_budget.toLocaleString()}</span>
              </div>
              <div className="stat-col">
                <span className="stat-label">TEAMS</span>
                <span className="stat-val" style={{ color: 'white' }}>{teams.length}</span>
              </div>
            </div>
            <button className="primary" onClick={() => window.open('/', '_blank')}>Live View</button>
            <button className="danger" onClick={handleLogout}>Logout</button>
          </>
        }
      />
      
      <div className="container">
        {renderContent()}
      </div>
    </>
  );
}
