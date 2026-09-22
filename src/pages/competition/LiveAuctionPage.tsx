import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { AuctionEvent, AuctionItem, AuctionBid, TeamBudget, Team } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function LiveAuctionPage() {
  const { user, isCaptain } = useAuth();
  const [auctionEvent, setAuctionEvent] = useState<AuctionEvent | null>(null);
  const [currentItem, setCurrentItem] = useState<AuctionItem | null>(null);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [teamBudget, setTeamBudget] = useState<TeamBudget | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [customBidAmount, setCustomBidAmount] = useState<number>(0);
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuctionState();

    // Subscribe to live auction bids via Supabase Realtime
    const channel = supabase
      .channel('live-auction-bids')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_bids' },
        (payload) => {
          setBids((prev) => [payload.new as AuctionBid, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_items' },
        (payload) => {
          const updated = payload.new as AuctionItem;
          if (updated.status === 'live') {
            setCurrentItem(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function loadAuctionState() {
    setLoading(true);
    // 1. Fetch active auction event
    const { data: eventData } = await supabase
      .from('auction_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventData) {
      setAuctionEvent(eventData as AuctionEvent);

      // 2. Fetch live item
      const { data: itemData } = await supabase
        .from('auction_items')
        .select('*')
        .eq('auction_event_id', eventData.id)
        .eq('status', 'live')
        .maybeSingle();

      if (itemData) {
        setCurrentItem(itemData as AuctionItem);
        // Fetch recent bids for this item
        const { data: bidData } = await supabase
          .from('auction_bids')
          .select('*')
          .eq('auction_item_id', itemData.id)
          .order('amount', { ascending: false });

        if (bidData) setBids(bidData as AuctionBid[]);
      }
    }

    // 3. Fetch user's squad & budget
    if (user) {
      const { data: memData } = await supabase
        .from('team_members')
        .select('*, teams:team_id (*)')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (memData?.team_id) {
        setMyTeam(memData.teams as Team);

        const { data: bData } = await supabase
          .from('team_budgets')
          .select('*')
          .eq('team_id', memData.team_id)
          .maybeSingle();

        if (bData) {
          setTeamBudget(bData as TeamBudget);
        }
      }
    }

    setLoading(false);
  }

  const highestBid = bids.length > 0 ? bids[0].amount : (currentItem?.base_price || 0);
  const minNextBid = highestBid + (auctionEvent?.bid_increment || 100);

  async function handlePlaceBid(amount: number) {
    if (!currentItem || !myTeam || !isCaptain) return;
    setBidError(null);

    // Client-side guard (validated on server as well)
    const available = teamBudget?.current_budget ?? 10000;
    if (amount > available) {
      setBidError(`Bid exceeds squad remaining budget ($${available.toLocaleString()}).`);
      return;
    }
    if (amount <= highestBid) {
      setBidError(`Bid must be strictly greater than current bid ($${highestBid.toLocaleString()}).`);
      return;
    }

    setBidding(true);
    try {
      const { error } = await supabase
        .from('auction_bids')
        .insert({
          auction_item_id: currentItem.id,
          team_id: myTeam.id,
          amount,
          status: 'accepted',
        });

      if (error) throw error;
      setCustomBidAmount(amount + (auctionEvent?.bid_increment || 100));
    } catch (err: any) {
      setBidError(err.message || 'Failed to submit bid.');
    } finally {
      setBidding(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Connecting to live auction telemetry..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Badge variant="live" pulse>AUCTION ROOM 01 &bull; LIVE</Badge>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Increment: ${auctionEvent?.bid_increment || 100}
            </span>
          </div>
          <h1 style={{ fontSize: '2rem' }}>Tactical Squad Bidding Room</h1>
        </div>

        {/* Squad Budget Widget */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Squad Budget: {myTeam?.name || 'Your Squad'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gold)' }}>
            ${(teamBudget?.current_budget ?? 10000).toLocaleString()}
          </div>
        </div>
      </div>

      {bidError && (
        <div style={{ padding: '0.875rem 1.25rem', background: 'var(--status-eliminated-bg)', border: '1px solid var(--status-eliminated-border)', borderRadius: 'var(--radius-md)', color: 'var(--status-eliminated)', fontSize: '0.875rem' }}>
          {bidError}
        </div>
      )}

      {/* Main Auction Arena Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Current Active Lot */}
        <div className="gcl-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <Badge variant="gold">CURRENT LOT ON STAGE</Badge>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                CATEGORY: {currentItem?.category || 'SPECIALIST'}
              </span>
            </div>

            {currentItem ? (
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {currentItem.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.9375rem' }}>
                  {currentItem.description || 'Specialist engineering profile available for squad acquisition.'}
                </p>

                {currentItem.skills && currentItem.skills.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {currentItem.skills.map((skill, idx) => (
                      <span key={idx} style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                <p>The auctioneer is currently preparing the next technical lot.</p>
              </div>
            )}
          </div>

          {/* Pricing & Bidding Box */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Price</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
                  ${(currentItem?.base_price ?? 500).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Highest Bid</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--gold)' }}>
                  ${highestBid.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Bid Action Form */}
            {isCaptain ? (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  variant="primary"
                  onClick={() => handlePlaceBid(minNextBid)}
                  isLoading={bidding}
                  style={{ flex: 1 }}
                >
                  Bid +${auctionEvent?.bid_increment || 100} (${minNextBid.toLocaleString()})
                </Button>
              </div>
            ) : (
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Only verified <strong>Team Captains</strong> possess authorized bidding keys.
              </div>
            )}
          </div>
        </div>

        {/* Live Bids Activity Feed */}
        <div className="gcl-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Bidding Activity Ledger</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px' }}>
            {bids.length > 0 ? (
              bids.map((bid, i) => (
                <div
                  key={bid.id || i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: i === 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface)',
                    border: `1px solid ${i === 0 ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {i === 0 ? '🏆 LEADING BID' : 'BID PLACED'}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>
                    ${bid.amount.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No bids recorded yet for this active lot.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
