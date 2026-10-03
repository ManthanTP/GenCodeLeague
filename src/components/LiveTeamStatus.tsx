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
  startingBudget,
  myTeamId,
  items = [],
  currentRoundIndex = 0,
}: LiveTeamStatusProps) {
  const effectiveStartingBudget = startingBudget || 50000000;
  const currentRIdx = Number(currentRoundIndex ?? 0);

  const displayRows = (teams || []).map((team) => {
    // Only items bought in the specified round
    const roundItems = (items || []).filter(
      (it) => it.team_id === team.id && Number(it.round_index) === currentRIdx
    );
    const itemsBought = roundItems.length;
    const spent = roundItems.reduce((acc, it) => acc + (it.cost || 0), 0);
    const isMyTeam = Boolean(
      myTeamId && (team.id === myTeamId || (team.linked_team_id && team.linked_team_id === myTeamId))
    );

    // Calculate exact remaining budget for this round
    let roundAllocated = effectiveStartingBudget;
    if (currentRIdx === 2) {
      // Round 3 budget includes Round 2 remaining budget carryover
      const r2Spent = (items || [])
        .filter((it) => it.team_id === team.id && Number(it.round_index) === 1)
        .reduce((acc, it) => acc + (it.cost || 0), 0);
      const r2Remaining = Math.max(0, effectiveStartingBudget - r2Spent);
      roundAllocated = effectiveStartingBudget + r2Remaining;
    }
    const calculatedRemaining = Math.max(0, roundAllocated - spent);
    const budget = calculatedRemaining;

    return {
      id: team.id,
      name: team.name,
      itemsBought,
      spent,
      budget,
      isYou: isMyTeam,
    };
  });

  return (
    <div style={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Title & Real-time pill outside the table card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', flexShrink: 0 }}>
        <h2
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#f5f5f7',
            letterSpacing: '0.02em',
            margin: 0,
            lineHeight: 1,
            fontFamily: "'Barlow Semi Condensed', sans-serif",
          }}
        >
          Live Team Status
        </h2>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            height: '26px',
            border: '1px solid rgba(255, 42, 61, 0.55)',
            borderRadius: '9999px',
            background: 'rgba(255, 42, 61, 0.12)',
            padding: '0 11px',
          }}
        >
          <div
            className="dot"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ff2a3d',
              boxShadow: '0 0 6px #ff2a3d',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ff2a3d',
              letterSpacing: '0.06em',
              fontFamily: "'Barlow Semi Condensed', sans-serif",
            }}
          >
            REAL-TIME
          </span>
        </div>
      </div>

      {/* Table Panel */}
      <div
        id="live-team-status-section"
        className="panel red"
        style={{
          padding: '16px 20px',
          position: 'relative',
          borderRadius: '16px',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Table Container with internal scroll */}
        <div
          className="gcl-thin-scrollbar"
          style={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '550px',
              borderCollapse: 'separate',
              borderSpacing: '0 3px',
              textAlign: 'left',
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
              <tr
                style={{
                  height: '38px',
                  background: '#15151b',
                  borderRadius: '6px',
                  color: '#8e8e9a',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  fontFamily: "'Barlow Semi Condensed', sans-serif",
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
                      color: '#8e8e9a',
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
                  const rowBg = isSelected
                    ? 'rgba(255, 42, 61, 0.12)'
                    : (isEven ? '#141419' : '#0e0e12');

                  return (
                    <tr
                      key={row.id}
                      style={{
                        height: '44px',
                        background: rowBg,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* Rank index # */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 8px',
                          borderTop: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderBottom: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderLeft: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderTopLeftRadius: '8px',
                          borderBottomLeftRadius: '8px',
                        }}
                      >
                        <div
                          className="num"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 700,
                            margin: '0 auto',
                            background: isSelected ? 'rgba(255, 42, 61, 0.25)' : '#1c1c24',
                            border: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#f5f5f7',
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
                          borderTop: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderBottom: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', color: '#f5f5f7', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                            {row.name}
                          </span>
                          {isSelected && (
                            <div
                              className="chip"
                              style={{
                                width: '38px',
                                height: '22px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: '#ff2a3d',
                                color: '#ffffff',
                                borderRadius: '6px',
                                boxShadow: '0 0 10px rgba(255, 42, 61, 0.4)',
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
                          verticalAlign: 'middle',
                          padding: '4px 12px',
                          borderTop: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderBottom: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '42px',
                              height: '28px',
                              borderRadius: '6px',
                              fontSize: '15px',
                              fontWeight: 700,
                              fontFamily: "'Barlow Semi Condensed', sans-serif",
                              fontVariantNumeric: 'tabular-nums',
                              lineHeight: 1,
                              background: row.itemsBought > 0 ? 'rgba(255, 42, 61, 0.18)' : '#18181f',
                              color: row.itemsBought > 0 ? '#ff2a3d' : '#8e8e9a',
                              border: row.itemsBought > 0 ? '1px solid rgba(255, 42, 61, 0.45)' : '1px solid #282832',
                              boxShadow: row.itemsBought > 0 ? '0 0 10px rgba(255, 42, 61, 0.3)' : 'none',
                            }}
                          >
                            {row.itemsBought}
                          </span>
                        </div>
                      </td>

                      {/* Total Spent this round */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 14px',
                          fontSize: '17px',
                          fontWeight: 700,
                          color: '#f5f5f7',
                          fontFamily: "'Barlow Semi Condensed', sans-serif",
                          fontVariantNumeric: 'tabular-nums',
                          borderTop: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderBottom: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                        }}
                      >
                        {formatCurrency(row.spent)}
                      </td>

                      {/* Remaining (Bright Green #2fd16f) */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0 14px',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#2fd16f',
                          fontFamily: "'Barlow Semi Condensed', sans-serif",
                          fontVariantNumeric: 'tabular-nums',
                          borderTop: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderBottom: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderRight: isSelected ? '1px solid rgba(255, 42, 61, 0.55)' : 'none',
                          borderTopRightRadius: '8px',
                          borderBottomRightRadius: '8px',
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
