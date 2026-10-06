import React, { useState } from 'react';
import { Settings, Plus, Minus, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Edition, Team, EventState } from '../types/database';
import '../admin.css';

interface AdminSetupProps {
  edition: Edition;
  eventState: EventState;
  teams: Team[];
}

export default function AdminSetup({ edition, eventState, teams }: AdminSetupProps) {
  const [budgetInput, setBudgetInput] = useState(edition.starting_budget.toString());
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamMembers, setNewTeamMembers] = useState('');
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
    const newTeamId = crypto.randomUUID();
    await supabase.from('teams').insert({
      id: newTeamId,
      edition_id: edition.id,
      name: newTeamName.trim(),
      budget: parseInt(budgetInput) || 50000000,
      sort_order: sortOrder
    });

    if (newTeamMembers.trim()) {
      const names = newTeamMembers.split(/[,;\n]/).map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        const records = names.map(name => ({
          id: crypto.randomUUID(),
          team_id: newTeamId,
          full_name: name,
          name: name,
          role: 'member'
        }));
        await supabase.from('team_members').insert(records);
      }
    }

    setNewTeamName('');
    setNewTeamMembers('');
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
    <div className="admin-shell" style={{ maxWidth: '680px', margin: '2rem auto', minWidth: 'auto' }}>
      <div className="admin-card space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-[#24242c]">
          <div className="w-10 h-10 rounded-xl bg-[#261014] border border-[#ff2a3d]/40 flex items-center justify-center text-[#ff4d5a]">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="admin-card-title mb-0">Event Configuration</h2>
            <p className="text-xs text-[#8e8e9a]">Setup starting team budgets & rosters before going live</p>
          </div>
        </div>
        
        <div>
          <label className="text-xs font-mono uppercase font-bold text-[#8e8e9a] block mb-1">Starting Budget</label>
          <div className="flex gap-3 items-center">
            <input 
              type="number" 
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="gcl-input flex-1 font-mono"
            />
            <button className="admin-btn-secondary" onClick={handleUpdateBudget} disabled={loading}>
              Update
            </button>
          </div>
          <div className="text-xs font-mono text-[#8e8e9a] mt-2">
            Current: <strong className="text-white">₹{(parseInt(budgetInput) || 0).toLocaleString()}</strong> (Applied to new teams)
          </div>
        </div>

        <div className="pt-4 border-t border-[#24242c] space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono uppercase font-bold text-[#8e8e9a]">Teams ({teams.length})</label>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {teams.map((team, idx) => (
              <div key={team.id} className="flex justify-between items-center p-3 rounded-xl bg-[#14141a] border border-[#24242c]">
                <span className="font-mono text-sm text-white font-bold">{idx + 1}. {team.name}</span>
                <button 
                  className="w-7 h-7 rounded-full bg-red-950/80 border border-red-800 text-[#ff4d5a] flex items-center justify-center hover:bg-red-900 transition-colors"
                  onClick={() => handleRemoveTeam(team.id)}
                  disabled={loading}
                  title="Remove Team"
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTeam} className="space-y-2 pt-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="New Team Name *" 
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="gcl-input flex-1"
              />
              <button type="submit" className="admin-btn-primary" disabled={loading || !newTeamName.trim()}>
                <Plus size={16} /> Add Team
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Member Names (Optional, comma-separated e.g. Alice, Bob)" 
              value={newTeamMembers}
              onChange={(e) => setNewTeamMembers(e.target.value)}
              className="gcl-input text-xs"
            />
          </form>
        </div>

        <div className="pt-4 border-t border-[#24242c]">
          <button 
            className="admin-btn-primary admin-btn-large w-full"
            onClick={handleStartEvent}
            disabled={loading || teams.length === 0}
          >
            <Play size={18} fill="currentColor" /> Start Live Auction
          </button>
        </div>
      </div>
    </div>
  );
}
