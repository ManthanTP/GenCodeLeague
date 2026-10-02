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
  const displayRows = (teams || []).map((team) => {
    const teamItems = (items || []).filter((it) => it.team_id === team.id);
    const spent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
    const isMyTeam = Boolean(myTeamId && (team.id === myTeamId || (team.linked_team_id && team.linked_team_id === myTeamId)));
    return {
      id: team.id,
      name: team.name,
      spent,
      budget: team.budget,
      isYou: isMyTeam,
    };
  });

  return (
    <div
      id="live-team-status-section"
      className="panel red"
      style={{
        padding: '18px 24px',
        minHeight: '385px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title & Real-time pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '14px', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#f4f4f6', letterSpacing: '0.02em', margin: 0, fontFamily: "'Rajdhani', sans-serif" }}>
          Live Team Status
        </h2>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            width: '126px',
            height: '32px',
            border: '1.5px solid #e8212e',
            borderRadius: '6px',
            background: 'rgba(232, 33, 46, 0.08)',
            padding: '0 12px',
          }}
        >
          <div className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e8212e', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#ff4350', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>
            REAL-TIME
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                height: '34px',
                background: '#1a1a1f',
                borderRadius: '6px 6px 0 0',
                color: '#9a9aa3',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.8px',
                fontFamily: "'Rajdhani', sans-serif",
              }}
            >
              <th style={{ width: '70px', textAlign: 'center', padding: '0 10px', borderTopLeftRadius: '6px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '0 16px' }}>TEAM NAME</th>
              <th style={{ width: '220px', textAlign: 'center', padding: '0 16px' }}>TOTAL SPENT</th>
              <th style={{ width: '220px', textAlign: 'center', padding: '0 16px', borderTopRightRadius: '6px' }}>REMAINING</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: '#9a9aa3',
                    fontSize: '15px',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  No teams registered yet.
                </td>
              </tr>
            ) : (
              displayRows.map((row, idx) => {
                const numStr = String(idx + 1).padStart(2, '0');
                const isSelected = row.isYou;

                return (
                  <tr
                    key={row.id}
                    style={{
                      height: isSelected ? '36px' : '35px',
                      background: isSelected ? '#2b0e13' : 'transparent',
                    }}
                  >
                    {/* Rank index # */}
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '0 10px',
                        height: isSelected ? '36px' : '35px',
                        borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                        borderBottom: isSelected ? '1px solid #7a1a22' : '1px solid #202026',
                        borderLeft: isSelected ? '1px solid #7a1a22' : 'none',
                        borderTopLeftRadius: isSelected ? '6px' : '0',
                        borderBottomLeftRadius: isSelected ? '6px' : '0',
                      }}
                    >
                      <div
                        className="num"
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '5px',
                          fontSize: '16px',
                          fontWeight: 700,
                          margin: '0 auto',
                        }}
                      >
                        {numStr}
                      </div>
                    </td>

                    {/* Team Name + YOU badge */}
                    <td
                      style={{
                        textAlign: 'left',
                        padding: '0 16px',
                        height: isSelected ? '36px' : '35px',
                        borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                        borderBottom: isSelected ? '1px solid #7a1a22' : '1px solid #202026',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: '#f4f4f6', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                          {row.name}
                        </span>
                        {isSelected && (
                          <div
                            className="chip"
                            style={{
                              width: '38px',
                              height: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            YOU
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Spent */}
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '0 16px',
                        fontSize: '16px',
                        color: '#f4f4f6',
                        fontFamily: "'Rajdhani', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                        height: isSelected ? '36px' : '35px',
                        borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                        borderBottom: isSelected ? '1px solid #7a1a22' : '1px solid #202026',
                      }}
                    >
                      {formatCurrency(row.spent)}
                    </td>

                    {/* Remaining */}
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '0 16px',
                        fontSize: '17px',
                        fontWeight: 600,
                        color: '#3fe085',
                        fontFamily: "'Rajdhani', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                        height: isSelected ? '36px' : '35px',
                        borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                        borderBottom: isSelected ? '1px solid #7a1a22' : '1px solid #202026',
                        borderRight: isSelected ? '1px solid #7a1a22' : 'none',
                        borderTopRightRadius: isSelected ? '6px' : '0',
                        borderBottomRightRadius: isSelected ? '6px' : '0',
                      }}
                    >
                      {formatCurrency(row.budget)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
