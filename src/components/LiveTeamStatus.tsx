import React from 'react';
import type { Team } from '../types/database';
import { formatCurrency } from '../utils/formatters';

interface LiveTeamStatusProps {
  teams: Team[];
  startingBudget: number;
}

export default function LiveTeamStatus({ teams, startingBudget }: LiveTeamStatusProps) {
  // Sort teams securely by sort_order or score
  const sortedTeams = [...teams].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-bold text-white uppercase tracking-wider text-center">
        Live Team Standings
      </h2>
      
      <div className="overflow-x-auto rounded-xl">
        <table className="table-attractive">
          <thead>
            <tr>
              <th className="text-left">Team Name</th>
              <th className="text-right">Total Spent</th>
              <th className="text-right text-green-400">Remaining Budget</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team) => {
              const spent = Math.max(0, startingBudget - team.budget);
              const isOutOfBudget = team.budget <= 0;
              const isLowBudget = !isOutOfBudget && team.budget <= 5000000;

              return (
                <tr key={team.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{team.name}</span>
                      {isOutOfBudget && (
                        <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                      )}
                      {isLowBudget && (
                        <span className="badge-low-budget">⚠️ LOW</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right font-mono text-red-400 font-semibold">
                    {formatCurrency(spent)}
                  </td>
                  <td className="text-right font-mono font-bold text-green-400 text-base">
                    {formatCurrency(team.budget)}
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
