import React from 'react';
import { useEventState } from '../hooks/useEventState';
import { useTeams } from '../hooks/useTeams';
import Header from '../components/Header';
import LiveTeamStatus from '../components/LiveTeamStatus';

export default function LiveView() {
  const { eventState, edition, loading } = useEventState();
  const { teams } = useTeams(edition?.id);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Event...</div>;
  }

  if (!eventState || !edition) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Awaiting Event Configuration...</div>;
  }

  // Calculate totals
  const totalSpent = teams.reduce((sum, team) => sum + (edition.starting_budget - team.budget), 0);

  const renderContent = () => {
    switch (eventState.game_state) {
      case 'setup':
        return (
          <div style={{ textAlign: 'center', marginTop: '10vh' }}>
            <div className="animate-pulse" style={{ fontSize: '4rem', marginBottom: '2rem' }}>⚙️</div>
            <h1 style={{ letterSpacing: '2px', fontSize: '2rem' }}>EVENT SETUP</h1>
            <p style={{ color: 'var(--text-muted)' }}>Configuration in Progress...</p>
          </div>
        );
      case 'waiting_start':
        return (
          <div style={{ textAlign: 'center', marginTop: '10vh' }}>
            <h4 style={{ color: 'var(--primary)', letterSpacing: '4px', textTransform: 'uppercase' }}>Official Auction</h4>
            <h1 style={{ fontSize: '5rem', lineHeight: '1.1', margin: '2rem 0', letterSpacing: '2px' }}>
              GENCODE<br/>LEAGUE
            </h1>
            <h2 style={{ letterSpacing: '4px', fontWeight: '400' }}>AUCTION STARTING SOON</h2>
          </div>
        );
      case 'active':
        return (
          <div>
            {/* Round info, Question, and Timer would go here */}
            {eventState.current_bid_preview && (
              <div className="card text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary)' }}>
                <h3 style={{ color: 'var(--success)' }}>LAST SUCCESSFUL BID</h3>
                <div className="flex justify-center gap-6 mt-4">
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WINNING TEAM</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{teams.find(t => t.id === eventState.current_bid_preview?.teamId)?.name}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FINAL BID</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{eventState.current_bid_preview?.amount.toLocaleString()}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QUESTION REF</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{eventState.current_bid_preview?.questionRef}</div>
                  </div>
                </div>
              </div>
            )}
            
            <LiveTeamStatus teams={teams} startingBudget={edition.starting_budget} />
          </div>
        );
      case 'intermission':
        return (
          <div style={{ textAlign: 'center', marginTop: '10vh' }}>
            <h1 style={{ fontSize: '3rem' }}>Intermission</h1>
            <p>Next round will start soon...</p>
          </div>
        );
      case 'winner_reveal':
        return (
          <div style={{ textAlign: 'center', marginTop: '10vh' }}>
            <h1 style={{ fontSize: '4rem', color: 'var(--warning)' }}>CHAMPIONS</h1>
            <h3 style={{ letterSpacing: '4px' }}>GRAND FINAL STANDINGS</h3>
            {/* Podium component will go here */}
          </div>
        );
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
                <span className="stat-val danger">₹{totalSpent.toLocaleString()}</span>
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
            {/* Just a dummy link to admin for easy navigation during dev */}
            <a href="/team-login" style={{ color: 'var(--text-main)', fontSize: '0.875rem' }}>Team Login</a>
            <button className="primary" onClick={() => window.open('/123456789/GCL@admin', '_blank')}>Admin Console</button>
          </>
        }
      />
      <div className="container">
        {renderContent()}
      </div>
    </>
  );
}
