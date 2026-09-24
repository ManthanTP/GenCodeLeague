import React from 'react';
import { Team } from '../types/database';

interface LiveTeamStatusProps {
  teams: Team[];
  startingBudget: number;
}

export default function LiveTeamStatus({ teams, startingBudget }: LiveTeamStatusProps) {
  // Sort teams securely by sort_order or score
  const sortedTeams = [...teams].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-4">
      <h2 className="text-center" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Live Team Status</h2>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Team Name</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Spent</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, idx) => {
              const spent = startingBudget - team.budget;
              return (
                <tr key={team.id} style={{ borderBottom: idx === sortedTeams.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{team.name}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: spent > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    ₹{spent > 0 ? spent.toLocaleString() : '0'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--success)', fontWeight: 'bold' }}>
                    ₹{team.budget.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
