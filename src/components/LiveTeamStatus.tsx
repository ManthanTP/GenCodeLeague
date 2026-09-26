import React from 'react';
import type { Team } from '../types/database';
import { formatCurrency } from '../utils/formatters';

interface LiveTeamStatusProps {
  teams: Team[];
  startingBudget: number;
  myTeamId?: string | null;
}

export default function LiveTeamStatus({ teams, startingBudget, myTeamId }: LiveTeamStatusProps) {
  // Sort teams strictly alphabetically A to Z (not rank)
  const sortedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return (
    <div className="mt-10 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide text-center">
          Live Team Status
        </h2>
        <span className="gcl-tech-tag gcl-tech-tag-emerald">
          <span className="gcl-tag-dot bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"></span>
          REAL-TIME
        </span>
      </div>

      <div className="gcl-table-container">
        {/* Header row */}
        <div className="grid-live-status-header">
          <div>TEAM NAME</div>
          <div className="text-right">TOTAL SPENT</div>
          <div className="text-right">REMAINING</div>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {sortedTeams.length > 0 ? (
            sortedTeams.map((team) => {
              const spent = Math.max(0, startingBudget - team.budget);
              const isOutOfBudget = team.budget <= 0;
              const isLowBudget = !isOutOfBudget && team.budget <= 5000000;
              const isMyTeam = team.id === myTeamId;

              return (
                <div
                  key={team.id}
                  className={`grid-live-status-row ${isMyTeam ? 'grid-live-status-me' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
                    <span className="font-bold text-white text-base md:text-lg truncate">
                      {team.name}
                    </span>
                    {isMyTeam && <span className="badge-you-inline">YOU</span>}
                    {isOutOfBudget && (
                      <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                    )}
                    {isLowBudget && (
                      <span className="badge-low-budget">⚠️ LOW</span>
                    )}
                  </div>

                  <div className="text-right font-mono font-semibold text-red-400 text-base md:text-lg">
                    {formatCurrency(spent)}
                  </div>

                  <div className="text-right font-mono font-bold text-green-400 text-base md:text-lg">
                    {formatCurrency(team.budget)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500 italic">
              No teams are currently participating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

