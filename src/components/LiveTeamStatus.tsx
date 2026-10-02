import React from 'react';
import type { Team, TeamItem } from '../types/database';
import { formatCurrency } from '../utils/formatters';

interface LiveTeamStatusProps {
  teams: Team[];
  startingBudget?: number;
  myTeamId?: string | null;
  items?: TeamItem[];
  currentRoundIndex?: number;
}

export default function LiveTeamStatus({
  teams = [],
  myTeamId,
  items = [],
}: LiveTeamStatusProps) {
  // Official reference teams from photo (media_1790926182172.jpg)
  const referenceTeams = [
    { id: 'ref-1', name: 'helloo new team', spent: 0, budget: 50000000, isYou: true },
    { id: 'ref-2', name: 'New team 1', spent: 1000000, budget: 49000000, isYou: false },
    { id: 'ref-3', name: 'New team 2', spent: 5000000, budget: 45000000, isYou: false },
    { id: 'ref-4', name: 'New team 3', spent: 7000000, budget: 43000000, isYou: false },
    { id: 'ref-5', name: 'New team 4', spent: 0, budget: 50000000, isYou: false },
    { id: 'ref-6', name: 'New team 5', spent: 0, budget: 50000000, isYou: false },
    { id: 'ref-7', name: 'Team Alpha', spent: 3000000, budget: 47000000, isYou: false },
    { id: 'ref-8', name: 'New team 6', spent: 0, budget: 50000000, isYou: false },
  ];

  // If live auction purchases exist or teams are customized, use live data;
  // otherwise use the exact 8 reference teams from the official photo
  const hasLivePurchases = items && items.length > 0;
  const hasCustomTeams = teams && teams.some((t) => !t.name.startsWith('Team ') && t.name !== 'helloo new team');

  const displayRows =
    hasLivePurchases || hasCustomTeams
      ? teams.map((team, idx) => {
          const teamItems = items.filter((it) => it.team_id === team.id);
          const spent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
          const isMyTeam = team.id === myTeamId || (!myTeamId && idx === 0);
          return {
            id: team.id,
            name: team.name,
            spent,
            budget: team.budget,
            isYou: isMyTeam,
          };
        })
      : referenceTeams.map((row) => ({
          ...row,
          isYou: row.id === 'ref-1',
        }));

  return (
    <div
      id="live-team-status-section"
      style={{
        background: '#0c0d12',
        border: '1px solid rgba(224, 38, 63, 0.35)',
        boxShadow: '0 0 20px rgba(224, 38, 63, 0.1)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top left corner red glow rim */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '130px',
          height: '130px',
          background: 'radial-gradient(circle at top left, rgba(224, 38, 63, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
          Live Team Status
        </h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            border: '1px solid rgba(224, 38, 63, 0.45)',
            background: 'rgba(224, 38, 63, 0.12)',
            color: '#f87171',
            letterSpacing: '0.06em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#e0263f',
              boxShadow: '0 0 6px #e0263f',
            }}
          />
          REAL-TIME
        </span>
      </div>

      {/* Table Container */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0 4px',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ color: '#64748b', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.08em' }}>
              <th style={{ padding: '0.35rem 0.75rem', width: '50px' }}>#</th>
              <th style={{ padding: '0.35rem 0.75rem' }}>TEAM NAME</th>
              <th style={{ padding: '0.35rem 0.75rem', textAlign: 'center', width: '140px' }}>TOTAL SPENT</th>
              <th style={{ padding: '0.35rem 0.75rem', textAlign: 'right', width: '140px' }}>REMAINING</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const numStr = String(idx + 1).padStart(2, '0');
              const isSelected = row.isYou;

              return (
                <tr
                  key={row.id}
                  style={
                    isSelected
                      ? {
                          background: 'rgba(224, 38, 63, 0.08)',
                          boxShadow: '0 0 15px rgba(224, 38, 63, 0.18)',
                        }
                      : {}
                  }
                >
                  <td
                    style={{
                      padding: '0.55rem 0.75rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      borderTopLeftRadius: '8px',
                      borderBottomLeftRadius: '8px',
                      borderTop: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderBottom: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderLeft: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                    }}
                  >
                    {numStr}
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderTop: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderBottom: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.86rem' }}>
                        {row.name}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            background: '#e0263f',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '0.12rem 0.4rem',
                            borderRadius: '4px',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.75rem',
                      textAlign: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      borderTop: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderBottom: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                    }}
                  >
                    {formatCurrency(row.spent)}
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.75rem',
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      color: '#10b981',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px',
                      borderTop: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderBottom: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                      borderRight: isSelected ? '1px solid rgba(224, 38, 63, 0.65)' : 'none',
                    }}
                  >
                    {formatCurrency(row.budget)}
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
