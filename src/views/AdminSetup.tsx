import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Edition, Team, EventState } from '../types/database';

interface AdminSetupProps {
  edition: Edition;
  eventState: EventState;
  teams: Team[];
}

export default function AdminSetup({ edition, eventState, teams }: AdminSetupProps) {
  const [budgetInput, setBudgetInput] = useState(edition.starting_budget.toString());
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateBudget = async () => {
    setLoading(true);
    await supabase
      .from('editions')
      .update({ starting_budget: parseInt(budgetInput) || 0 })
      .eq('id', edition.id);
    setLoading(false);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);

    const sortOrder = teams.length + 1;
    await supabase.from('teams').insert({
      edition_id: edition.id,
      name: newTeamName.trim(),
      budget: parseInt(budgetInput) || 50000000,
      sort_order: sortOrder
    });

    setNewTeamName('');
    setLoading(false);
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to remove this team?')) return;
    setLoading(true);
    await supabase.from('teams').delete().eq('id', teamId);
    setLoading(false);
  };

  const handleStartEvent = async () => {
    if (teams.length === 0) {
      alert('Please add at least one team before starting.');
      return;
    }
    
    setLoading(true);
    await supabase
      .from('event_state')
      .update({ game_state: 'waiting_start' })
      .eq('id', eventState.id);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚙️</span> Event Configuration
        </h2>
        
        <div className="mt-4">
          <label style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Starting Budget</label>
          <div className="flex gap-4 mt-2">
            <input 
              type="number" 
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="primary" onClick={handleUpdateBudget} disabled={loading}>Update</button>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Current: ₹{(parseInt(budgetInput) || 0).toLocaleString()} (Will be applied to new teams)
          </div>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4">
            <label style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Teams ({teams.length})</label>
          </div>

          <div className="flex-col gap-2 mb-4" style={{ display: 'flex' }}>
            {teams.map((team, idx) => (
              <div key={team.id} className="flex justify-between items-center" style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span>{idx + 1}. {team.name}</span>
                <button 
                  className="danger" 
                  style={{ padding: '0.2rem 0.6rem', borderRadius: '50%' }}
                  onClick={() => handleRemoveTeam(team.id)}
                  disabled={loading}
                >
                  −
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTeam} className="flex gap-2">
            <input 
              type="text" 
              placeholder="New Team Name" 
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="primary" disabled={loading || !newTeamName.trim()}>+ Add Team</button>
          </form>
        </div>

        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button 
            className="primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', letterSpacing: '1px' }}
            onClick={handleStartEvent}
            disabled={loading || teams.length === 0}
          >
            ▶ Start Live Auction
          </button>
        </div>
      </div>
    </div>
  );
}
