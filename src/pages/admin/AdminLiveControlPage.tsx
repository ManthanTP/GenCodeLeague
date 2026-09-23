import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { EventState, Team, Edition, AuctionEvent, Profile, TimerState, EventLiveState } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export function AdminLiveControlPage() {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auctionEvent, setAuctionEvent] = useState<AuctionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const [localTimer, setLocalTimer] = useState<number>(180);
  const timerRef = useRef<any>(null);

  // Form State
  const [startingBudget, setStartingBudget] = useState('50000000'); // 5 Cr default
  const [questionText, setQuestionText] = useState('Enter question for R1 - Q1');
  const [bidAmount, setBidAmount] = useState<number>(2000000); // Base 20L
  const [winningTeamId, setWinningTeamId] = useState<string>('');
  
  // New Team State
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    loadData();

    // Subscribe to event_state and teams
    const channel = supabase
      .channel('admin-live-control')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, (payload) => {
        if (payload.new) {
          const state = payload.new as EventState;
          setEventState(state);
          setLocalTimer(state.timer_remaining_seconds || 180);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        if (edition) loadTeams(edition.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [edition?.id]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (eventState?.timer_state === 'running' && localTimer > 0) {
      timerRef.current = setInterval(() => {
        setLocalTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleUpdateTimer('expired', 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventState?.timer_state, localTimer]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).maybeSingle();
      if (edData) {
        setEdition(edData as Edition);
        
        await loadTeams(edData.id);
        
        const { data: evState } = await supabase.from('event_state').select('*').eq('edition_id', edData.id).maybeSingle();
        if (evState) setEventState(evState as EventState);

        const { data: aucEv } = await supabase.from('auction_events').select('*').eq('edition_id', edData.id).maybeSingle();
        if (aucEv) setAuctionEvent(aucEv as AuctionEvent);
        
        const { data: profData } = await supabase.from('profiles').select('*');
        if (profData) setProfiles(profData as Profile[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams(editionId: string) {
    const { data } = await supabase.from('teams').select('*').eq('edition_id', editionId).order('created_at', { ascending: true });
    if (data) setTeams(data as Team[]);
  }

  // --- ACTIONS ---

  async function handleAddTeam() {
    if (!newTeamName.trim() || !edition) return;
    const b = parseInt(startingBudget) || 50000000;
    await supabase.from('teams').insert({
      edition_id: edition.id,
      name: newTeamName,
      starting_budget: b,
      remaining_budget: b,
      score: 0,
      status: 'approved'
    });
    setNewTeamName('');
    await loadTeams(edition.id);
  }

  async function handleRemoveTeam(id: string) {
    if (confirm('Remove this team?')) {
      await supabase.from('teams').delete().eq('id', id);
      await loadTeams(edition!.id);
    }
  }

  async function handleStartAuction() {
    if (!edition || !eventState) return;
    
    // Ensure auction event exists
    if (!auctionEvent) {
      const { data: newAuc } = await supabase.from('auction_events').insert({
        edition_id: edition.id,
        name: 'GCL Live Auction',
        starting_budget: parseInt(startingBudget) || 50000000,
        bid_increment: 500000,
        timer_duration_seconds: 180,
        status: 'live'
      }).select().single();
      setAuctionEvent(newAuc as AuctionEvent);
    }

    await supabase.from('event_state').update({
      state: 'LIVE',
      timer_state: 'stopped',
      timer_remaining_seconds: 180,
    }).eq('id', eventState.id);
    
    // Auto-update all team budgets
    for (const t of teams) {
      const b = parseInt(startingBudget) || 50000000;
      await supabase.from('teams').update({
        starting_budget: b,
        remaining_budget: b,
      }).eq('id', t.id);
    }
  }

  async function handleUpdateTimer(state: TimerState, remaining: number) {
    if (!eventState) return;
    await supabase.from('event_state').update({
      timer_state: state,
      timer_remaining_seconds: remaining,
      timer_started_at: state === 'running' ? new Date().toISOString() : null,
      timer_paused_at: state === 'paused' ? new Date().toISOString() : null,
    }).eq('id', eventState.id);
  }

  async function handleProcessAnswer(isCorrect: boolean) {
    if (!winningTeamId || !eventState) {
      alert("Select a winning team first!");
      return;
    }
    
    if (!confirm(`Mark as SOLD to Team ${teams.find(t=>t.id===winningTeamId)?.name} for ${formatINR(bidAmount)}?`)) return;

    // Deduct budget
    const team = teams.find(t => t.id === winningTeamId);
    if (team) {
      const newBudget = (team.remaining_budget ?? team.starting_budget) - bidAmount;
      const newScore = team.score + (isCorrect ? 1 : 0);
      
      await supabase.from('teams').update({
        remaining_budget: newBudget,
        score: newScore,
        total_spent: (team.starting_budget - newBudget)
      }).eq('id', winningTeamId);
      
      // Log transaction
      if (auctionEvent) {
        await supabase.from('auction_transactions').insert({
          auction_event_id: auctionEvent.id,
          auction_item_id: eventState.active_auction_item_id || undefined, // we might not have a strict item mapped
          team_id: winningTeamId,
          amount: bidAmount,
          previous_budget: team.remaining_budget,
          new_budget: newBudget,
          transaction_type: 'purchase',
          notes: `Purchased question ${isCorrect ? '(Correct)' : '(Incorrect)'}`
        });
      }
    }
    
    // Reset selection
    setWinningTeamId('');
    setBidAmount(2000000);
    handleUpdateTimer('stopped', 180);
  }

  // Calculate Header Stats
  const totalSpent = teams.reduce((acc, t) => acc + (t.total_spent || 0), 0);
  const totalAvailable = teams.reduce((acc, t) => acc + (t.remaining_budget || 0), 0);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1128' }}><LoadingSpinner text="Initializing Control Panel..." /></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a1128', color: '#fff', fontFamily: 'var(--font-sans)', paddingBottom: '4rem' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: '#070b19', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>🔨</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '1px' }}>GEN CODE LEAGUE</div>
            <div style={{ fontSize: '0.65rem', color: '#22d3ee', letterSpacing: '2px', textTransform: 'uppercase' }}>● LIVE AUCTION</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Spent</div>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem' }}>{formatINR(totalSpent)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Available</div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.875rem' }}>{formatINR(totalAvailable)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Teams</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>👥 {teams.length}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="primary" size="sm" onClick={() => window.open('/live', '_blank')} style={{ borderRadius: '20px' }}>👁 Live View</Button>
            <Button variant="danger" size="sm" onClick={() => window.location.href = '/'} style={{ borderRadius: '20px' }}>🔒 Logout</Button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* EVENT CONFIGURATION - Only show if not LIVE */}
        {eventState?.state === 'NOT_STARTED' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ color: '#3b82f6' }}>⚙️</span> Event Configuration
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Starting Budget</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={startingBudget} 
                  onChange={e => setStartingBudget(e.target.value)} 
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px' }}
                />
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {formatINR(parseInt(startingBudget) || 0)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Teams ({teams.length})</label>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {teams.map((t, idx) => (
                  <div key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', width: '20px' }}>{idx + 1}.</span>
                    <input type="text" value={t.name} readOnly style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem', borderRadius: '6px' }} />
                    <button onClick={() => handleRemoveTeam(t.id)} style={{ width: '30px', height: '30px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="New Team Name" style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem', borderRadius: '6px' }} />
                <Button variant="primary" size="sm" onClick={handleAddTeam} style={{ borderRadius: '20px' }}>+ Add Team</Button>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={handleStartAuction}>
              ▶ Start Live Auction
            </Button>
          </div>
        )}

        {/* LIVE CONTROL MODULES */}
        {eventState?.state !== 'NOT_STARTED' && (
          <>
            {/* ROUND PROGRESSION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🔄</span> Round Progression
              </h3>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#fbbf24', fontWeight: 700, letterSpacing: '2px' }}>R1 - Q1 / 20</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Manual Round Selection</label>
                  <select style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px' }}>
                    <option>Round 1 (Round 1)</option>
                    <option>Round 2 (Round 2)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Manual Question Index</label>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <button style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>{'<'}</button>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}><span style={{ color: '#fbbf24', fontWeight: 700, marginRight: '4px' }}>1</span> of 20</div>
                    <button style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#fff', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>{'>'}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* TEAM MANAGEMENT COMPACT */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>👥</span> Team Management
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {teams.map((t, idx) => (
                  <div key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', width: '20px' }}>{idx + 1}.</span>
                    <input type="text" value={t.name} readOnly style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem', borderRadius: '6px' }} />
                    <button onClick={() => handleRemoveTeam(t.id)} style={{ width: '30px', height: '30px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  </div>
                ))}
              </div>
            </div>

            {/* QUESTION & TIMER */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', position: 'relative' }}>
              <Badge variant="subtle" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                👁 HIDDEN FROM PLAYERS
              </Badge>

              <h3 style={{ fontSize: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>❓</span> Question & Timer
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Item/Question Name</label>
                <textarea 
                  value={questionText} 
                  onChange={e => setQuestionText(e.target.value)}
                  style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '8px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.5rem', color: '#ef4444' }}>⏱</span>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bid Timer</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {Math.floor(localTimer / 60).toString().padStart(2, '0')}:{(localTimer % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {eventState?.timer_state === 'running' ? (
                    <Button variant="outline" style={{ color: '#fbbf24', borderColor: '#fbbf24' }} onClick={() => handleUpdateTimer('paused', localTimer)}>
                      ⏸ Pause
                    </Button>
                  ) : (
                    <Button variant="primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => handleUpdateTimer('running', localTimer)}>
                      ▶ Start (Reveals Q)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { handleUpdateTimer('stopped', 180); setLocalTimer(180); }}>
                    🔄 Reset
                  </Button>
                </div>
              </div>
            </div>

            {/* FINAL BID & ANSWER */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🔨</span> Final Bid & Answer
              </h3>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Winning Team</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {teams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setWinningTeamId(t.id)}
                        style={{
                          padding: '0.75rem',
                          background: winningTeamId === t.id ? 'rgba(34, 211, 238, 0.2)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${winningTeamId === t.id ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: '80px'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>{t.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>★ {t.score}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: '350px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Bid Amount (Base: ₹20.00 L)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      value={bidAmount}
                      onChange={e => setBidAmount(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={()=>setBidAmount(p=>p+2000000)} style={{ flex: 1, padding: '0.5rem', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>+₹20.0 L</button>
                      <button onClick={()=>setBidAmount(p=>p+1000000)} style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>+₹10.0 L</button>
                      <button onClick={()=>setBidAmount(p=>p+500000)} style={{ flex: 1, padding: '0.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>+ 50 L</button>
                      <button onClick={()=>setBidAmount(p=>Math.max(0, p-1000000))} style={{ flex: 1, padding: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>- 10 L</button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#fbbf24' }}>❓</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Answer Result</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Did the team answer correctly?</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => handleProcessAnswer(false)} style={{ padding: '0.75rem 2rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>⊗</span> Incorrect (0)
                    </button>
                    <button onClick={() => handleProcessAnswer(true)} style={{ padding: '0.75rem 2rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>✓</span> Correct (+1)
                    </button>
                  </div>
                </div>
              </div>

              <button 
                disabled={!winningTeamId}
                onClick={() => handleProcessAnswer(false)}
                style={{ width: '100%', padding: '1rem', background: winningTeamId ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: winningTeamId ? '#fff' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '8px', cursor: winningTeamId ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '1rem' }}
              >
                ● SOLD! (Requires Result Selection)
              </button>
            </div>

            {/* CORRECTIONS */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem', color: '#fbbf24' }}>↩</span>
                <span style={{ fontWeight: 600, color: '#fbbf24' }}>Corrections</span>
              </div>
              <Button variant="outline" style={{ color: '#fff' }} onClick={() => alert('Undo functionality not implemented in demo')}>Undo Last Transaction</Button>
            </div>
            
          </>
        )}
      </main>
    </div>
  );
}
