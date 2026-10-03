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
  currentRoundIndex = 0,
}: LiveTeamStatusProps) {
  const displayRows = (teams || []).map((team) => {
    // Only items bought in the specified round
    const roundItems = (items || []).filter(
      (it) => it.team_id === team.id && it.round_index === currentRoundIndex
    );
    const itemsBought = roundItems.length;
    const spent = roundItems.reduce((acc, it) => acc + (it.cost || 0), 0);
    const isMyTeam = Boolean(
      myTeamId && (team.id === myTeamId || (team.linked_team_id && team.linked_team_id === myTeamId))
    );
    return {
      id: team.id,
      name: team.name,
      itemsBought,
      spent,
      budget: team.budget,
      isYou: isMyTeam,
    };
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Title & Real-time pill outside the table card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f4f4f6', letterSpacing: '0.02em', margin: 0, lineHeight: 1, fontFamily: "'Rajdhani', sans-serif" }}>
          Live Team Status
        </h2>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            height: '26px',
            border: '1px solid rgba(232, 33, 46, 0.55)',
            borderRadius: '9999px',
            background: 'rgba(232, 33, 46, 0.12)',
            padding: '0 11px',
          }}
        >
          <div className="dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e8212e', boxShadow: '0 0 6px #e8212e', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ff4350', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>
            REAL-TIME
          </span>
        </div>
      </div>

      {/* Table Panel */}
      <div
        id="live-team-status-section"
        className="panel red"
        style={{
          padding: '10px 14px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '14px',
        }}
      >
        {/* Table Container */}
        <div style={{ width: '100%', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 2px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  height: '34px',
                  background: '#1a1a1f',
                  borderRadius: '6px',
                  color: '#9a9aa3',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                <th style={{ width: '60px', textAlign: 'center', padding: '0 8px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '0 14px' }}>TEAM NAME</th>
                <th style={{ width: '130px', textAlign: 'center', padding: '0 12px' }}>ITEMS WON</th>
                <th style={{ width: '180px', textAlign: 'center', padding: '0 14px' }}>TOTAL SPENT</th>
                <th style={{ width: '180px', textAlign: 'center', padding: '0 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>REMAINING</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '2rem 1rem',
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
                  const isEven = idx % 2 === 0;
                  const rowBg = isSelected ? '#2b0e13' : (isEven ? '#18181d' : '#121216');

                  return (
                    <tr
                      key={row.id}
                      style={{
                        height: isSelected ? '38px' : '36px',
                        background: rowBg,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* Rank index # */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 8px',
                          borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                          borderBottom: isSelected ? '1px solid #7a1a22' : 'none',
                          borderLeft: isSelected ? '1px solid #7a1a22' : 'none',
                          borderTopLeftRadius: '6px',
                          borderBottomLeftRadius: '6px',
                        }}
                      >
                        <div
                          className="num"
                          style={{
                            width: '40px',
                            height: '24px',
                            borderRadius: '5px',
                            fontSize: '15px',
                            fontWeight: 700,
                            margin: '0 auto',
                            background: isSelected ? '#3a1015' : undefined,
                          }}
                        >
                          {numStr}
                        </div>
                      </td>

                      {/* Team Name + YOU badge */}
                      <td
                        style={{
                          textAlign: 'left',
                          padding: '0 14px',
                          borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                          borderBottom: isSelected ? '1px solid #7a1a22' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', color: '#f4f4f6', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
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

                      {/* Items Won this round */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 12px',
                          borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                          borderBottom: isSelected ? '1px solid #7a1a22' : 'none',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '26px',
                            height: '22px',
                            padding: '0 8px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: 700,
                            fontFamily: "'Rajdhani', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                            background: row.itemsBought > 0 ? 'rgba(232, 33, 46, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: row.itemsBought > 0 ? '#ff4d5a' : '#8a8a94',
                            border: row.itemsBought > 0 ? '1px solid rgba(232, 33, 46, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {row.itemsBought}
                        </span>
                      </td>

                      {/* Total Spent this round */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 14px',
                          fontSize: '16px',
                          color: '#f4f4f6',
                          fontFamily: "'Rajdhani', sans-serif",
                          fontVariantNumeric: 'tabular-nums',
                          borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                          borderBottom: isSelected ? '1px solid #7a1a22' : 'none',
                        }}
                      >
                        {formatCurrency(row.spent)}
                      </td>

                      {/* Remaining */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 14px',
                          fontSize: '17px',
                          fontWeight: 600,
                          color: '#3fe085',
                          fontFamily: "'Rajdhani', sans-serif",
                          fontVariantNumeric: 'tabular-nums',
                          borderTop: isSelected ? '1px solid #7a1a22' : 'none',
                          borderBottom: isSelected ? '1px solid #7a1a22' : 'none',
                          borderRight: isSelected ? '1px solid #7a1a22' : 'none',
                          borderTopRightRadius: '6px',
                          borderBottomRightRadius: '6px',
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
    </div>
  );
}
