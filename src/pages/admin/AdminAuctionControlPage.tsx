import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuctionEvent, AuctionItem, Team, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminAuctionControlPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuctionEvent | null>(null);
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [liveItem, setLiveItem] = useState<AuctionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New Item State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Specialist Engineer');
  const [basePrice, setBasePrice] = useState(500);
  const [skillsStr, setSkillsStr] = useState('React, Rust, Systems');

  // Live Bidding Desk State
  const [bidTeamId, setBidTeamId] = useState('');
  const [bidAmount, setBidAmount] = useState(500);
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [winningTeamId, setWinningTeamId] = useState('');
  const [finalPrice, setFinalPrice] = useState(500);

  useEffect(() => {
    loadAuctionData();

    // Listen to items & event_state
    const channel = supabase
      .channel('admin-auction-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_items' }, () => {
        if (selectedEvent) loadItems(selectedEvent.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        if (currentEdition) loadTeams(currentEdition.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadAuctionData() {
    setLoading(true);
    try {
      const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).maybeSingle();
      if (edData) {
        setCurrentEdition(edData as Edition);
        await loadTeams(edData.id);

        let { data: evData } = await supabase
          .from('auction_events')
          .select('*')
          .eq('edition_id', edData.id)
          .maybeSingle();

        if (!evData) {
          const { data: createdEv } = await supabase
            .from('auction_events')
            .insert({
              edition_id: edData.id,
              name: `${edData.name} Official Auction`,
              starting_budget: 1000,
              bid_increment: 50,
              timer_duration_seconds: 30,
              status: 'live',
            })
            .select()
            .single();
          evData = createdEv;
        }

        if (evData) {
          setSelectedEvent(evData as AuctionEvent);
          await loadItems(evData.id);
        }
      }
    } catch (err) {
      console.error('Error loading auction console:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams(editionId: string) {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('edition_id', editionId)
      .order('name', { ascending: true });
    if (data) {
      setTeams(data as Team[]);
      if (data.length > 0 && !bidTeamId) {
        setBidTeamId(data[0].id);
        setWinningTeamId(data[0].id);
      }
    }
  }

  async function loadItems(eventId: string) {
    const { data } = await supabase
      .from('auction_items')
      .select('*, current_bidder:teams!auction_items_current_bidder_team_id_fkey(*)')
      .eq('auction_event_id', eventId)
      .order('sort_order', { ascending: true });

    if (data) {
      setItems(data as unknown as AuctionItem[]);
      const active = data.find((i) => i.status === 'live');
      setLiveItem((active as unknown as AuctionItem) || null);
      if (active) {
        setBidAmount(active.current_bid || active.base_price);
        setFinalPrice(active.current_bid || active.base_price);
        if (active.current_bidder_team_id) {
          setBidTeamId(active.current_bidder_team_id);
          setWinningTeamId(active.current_bidder_team_id);
        }
      }
    }
  }

  async function handlePutOnStage(item: AuctionItem) {
    if (!selectedEvent || !currentEdition) return;
    setActionLoading(true);
    try {
      // 1. Mark existing live items as available
      await supabase
        .from('auction_items')
        .update({ status: 'available' })
        .eq('auction_event_id', selectedEvent.id)
        .eq('status', 'live');

      // 2. Put this item live
      await supabase
        .from('auction_items')
        .update({
          status: 'live',
          current_bid: item.base_price,
          current_bidder_team_id: null,
        })
        .eq('id', item.id);

      // 3. Update global event_state for projector and team view
      await supabase
        .from('event_state')
        .update({
          state: 'LIVE',
          active_auction_item_id: item.id,
          current_bid_amount: item.base_price,
          current_bid_team_id: null,
          timer_duration_seconds: 30,
          timer_remaining_seconds: 30,
          timer_state: 'running',
          timer_started_at: new Date().toISOString(),
          banner_message: `Lot on Stage: ${item.name} (Base Price: ${item.base_price} cr)`,
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      await loadItems(selectedEvent.id);
    } catch (err: any) {
      alert(`Failed to put lot on stage: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminPlaceBid(delta: number) {
    if (!liveItem || !bidTeamId || !currentEdition) return;
    const targetTeam = teams.find((t) => t.id === bidTeamId);
    if (!targetTeam) return;

    const newAmount = (liveItem.current_bid || liveItem.base_price) + delta;

    if (newAmount > (targetTeam.remaining_budget || 0)) {
      alert(`Cannot place bid! ${targetTeam.name} only has ${targetTeam.remaining_budget} credits remaining.`);
      return;
    }

    setActionLoading(true);
    try {
      // Update auction_items
      await supabase
        .from('auction_items')
        .update({
          current_bid: newAmount,
          current_bidder_team_id: bidTeamId,
        })
        .eq('id', liveItem.id);

      // Update event_state
      await supabase
        .from('event_state')
        .update({
          current_bid_amount: newAmount,
          current_bid_team_id: bidTeamId,
          timer_remaining_seconds: 20, // Reset countdown on new high bid
          timer_state: 'running',
          timer_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      setBidAmount(newAmount);
      setFinalPrice(newAmount);
      setWinningTeamId(bidTeamId);
      await loadItems(selectedEvent!.id);
    } catch (err: any) {
      alert(`Bid submission error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmSold() {
    if (!liveItem || !winningTeamId || !currentEdition || !selectedEvent) return;
    const winningTeam = teams.find((t) => t.id === winningTeamId);
    if (!winningTeam) return;

    setActionLoading(true);
    try {
      const price = Number(finalPrice);
      const prevBudget = Number(winningTeam.remaining_budget) || 1000;
      const newBudget = Math.max(0, prevBudget - price);
      const newSpent = (Number(winningTeam.total_spent) || 0) + price;

      // 1. Deduct budget from team
      await supabase
        .from('teams')
        .update({
          remaining_budget: newBudget,
          total_spent: newSpent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', winningTeamId);

      // 2. Insert into auction_transactions
      const { data: tx } = await supabase
        .from('auction_transactions')
        .insert({
          auction_event_id: selectedEvent.id,
          auction_item_id: liveItem.id,
          team_id: winningTeamId,
          amount: price,
          previous_budget: prevBudget,
          new_budget: newBudget,
          transaction_type: 'purchase',
          notes: `Hammer down! Sold to ${winningTeam.name} for ${price} credits`,
        })
        .select()
        .single();

      // 3. Insert into team_roster
      await supabase.from('team_roster').insert({
        edition_id: currentEdition.id,
        team_id: winningTeamId,
        item_id: liveItem.id,
        purchase_price: price,
        transaction_id: tx?.id || null,
        notes: `Acquired in official auction lot`,
      });

      // 4. Mark item as sold
      await supabase
        .from('auction_items')
        .update({
          status: 'sold',
          current_bid: price,
          current_bidder_team_id: winningTeamId,
        })
        .eq('id', liveItem.id);

      // 5. Update event_state
      await supabase
        .from('event_state')
        .update({
          active_auction_item_id: null,
          banner_message: `SOLD! ${liveItem.name} acquired by ${winningTeam.name} for ${price} cr!`,
          timer_state: 'stopped',
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      setSoldModalOpen(false);
      await loadAuctionData();
      alert(`Success! Lot sold to ${winningTeam.name} for ${price} credits.`);
    } catch (err: any) {
      alert(`Error completing sale: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkUnsold(itemId: string) {
    if (!currentEdition) return;
    setActionLoading(true);
    try {
      await supabase.from('auction_items').update({ status: 'unsold' }).eq('id', itemId);
      await supabase
        .from('event_state')
        .update({
          active_auction_item_id: null,
          banner_message: 'Lot marked UNSOLD by Auctioneer.',
          timer_state: 'stopped',
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', currentEdition.id);

      await loadItems(selectedEvent!.id);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !itemName.trim()) return;

    setActionLoading(true);
    try {
      const skills = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      await supabase.from('auction_items').insert({
        auction_event_id: selectedEvent.id,
        name: itemName.trim(),
        description: description.trim(),
        category,
        skills,
        base_price: basePrice,
        status: 'available',
        sort_order: items.length + 1,
      });

      setIsModalOpen(false);
      setItemName('');
      setDescription('');
      await loadItems(selectedEvent.id);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Loading Master Auction Console..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Master Auction Control Console
            </h1>
            <Badge variant="live" pulse>
              AUCTIONEER DESK
            </Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            PRD Compliance: Official auction is strictly operated by Admin. Teams observe live broadcast without bidding buttons.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          + Create Technical Lot
        </Button>
      </div>

      {/* Live Stage Module (Active Lot + Bidding Desk) */}
      {liveItem ? (
        <div
          className="card"
          style={{
            padding: '2rem',
            border: '2px solid var(--accent-cyan)',
            background: 'linear-gradient(180deg, rgba(34, 211, 238, 0.08) 0%, rgba(15, 17, 24, 0.95) 100%)',
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Badge variant="live" pulse>
                🔴 CURRENTLY ON STAGE
              </Badge>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
                {liveItem.name}
              </h2>
              <Badge variant="subtle">{liveItem.category}</Badge>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setFinalPrice(liveItem.current_bid || liveItem.base_price);
                  setWinningTeamId(liveItem.current_bidder_team_id || (teams[0]?.id || ''));
                  setSoldModalOpen(true);
                }}
              >
                🔨 Hammer: SOLD!
              </Button>
              <Button variant="ghost" size="md" onClick={() => handleMarkUnsold(liveItem.id)}>
                Mark UNSOLD
              </Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                {liveItem.description || 'Premium technical asset featuring advanced capabilities.'}
              </p>
              {liveItem.skills && liveItem.skills.length > 0 && (
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {liveItem.skills.map((skill, idx) => (
                    <Badge key={idx} variant="subtle">{skill}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Current High Bid & Leader */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Current Highest Bid
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {liveItem.current_bid || liveItem.base_price} <span style={{ fontSize: '1rem' }}>cr</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#34d399', fontWeight: 600, marginTop: '0.25rem' }}>
                Leading: {liveItem.current_bidder?.name || 'Base Reserve (No bids yet)'}
              </div>
            </div>
          </div>

          {/* Admin Bid Execution Controls */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Bidder Team:</label>
                <select
                  className="form-input"
                  style={{ width: '220px' }}
                  value={bidTeamId}
                  onChange={(e) => setBidTeamId(e.target.value)}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.remaining_budget} cr left)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[50, 100, 200, 500].map((inc) => (
                  <Button
                    key={inc}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdminPlaceBid(inc)}
                    disabled={actionLoading}
                  >
                    +{inc} cr
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔨</div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: '0 0 0.5rem 0' }}>
            No Lot Currently on Stage
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Choose an available technical lot from the catalog below and click "Put on Stage" to commence live bidding.
          </p>
        </div>
      )}

      {/* Lot Catalog Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Auction Inventory Catalog
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Total Lots: <strong>{items.length}</strong>
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Lot Name & Skills</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Base Reserve</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No auction lots created yet. Click "+ Create Technical Lot" to populate the catalog.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.skills?.join(', ') || item.description}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant="subtle">{item.category}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {item.base_price} cr
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge
                        variant={
                          item.status === 'live'
                            ? 'live'
                            : item.status === 'sold'
                            ? 'qualified'
                            : item.status === 'unsold'
                            ? 'danger'
                            : 'subtle'
                        }
                        pulse={item.status === 'live'}
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      {item.status !== 'live' && item.status !== 'sold' && (
                        <Button variant="outline" size="sm" onClick={() => handlePutOnStage(item)} disabled={actionLoading}>
                          Put on Stage
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Lot Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Technical Auction Lot">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Lot Name</label>
            <input
              type="text"
              className="form-input"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Lead Machine Learning Architect"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Specialist Engineer</option>
                <option>Algorithm Blueprint</option>
                <option>High-Compute Resource</option>
                <option>Strategic Advantage</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Base Reserve (credits)</label>
              <input
                type="number"
                className="form-input"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Specialist Skills (comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="PyTorch, CUDA, High-Throughput APIs"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Technical Description</label>
            <textarea
              className="form-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Strategic description of strengths..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={actionLoading}>
              Save to Auction Catalog
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hammer Down / SOLD Modal */}
      <Modal isOpen={soldModalOpen} onClose={() => setSoldModalOpen(false)} title="Confirm Auction Lot Sale">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Confirming the sale will deduct the final price from the winning team's budget, log the audit transaction, and add this lot to the team's official roster.
          </p>

          <div className="form-group">
            <label className="form-label">Winning Team</label>
            <select
              className="form-input"
              value={winningTeamId}
              onChange={(e) => setWinningTeamId(e.target.value)}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Budget: {t.remaining_budget} cr)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Final Hammer Price (credits)</label>
            <input
              type="number"
              className="form-input"
              value={finalPrice}
              onChange={(e) => setFinalPrice(Number(e.target.value))}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="ghost" onClick={() => setSoldModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmSold} isLoading={actionLoading}>
              🔨 Confirm & Deduct Budget
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
