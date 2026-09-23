import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { AuctionItem, Team, TeamRosterItem, EventState } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function LiveAuctionPage() {
  const { team } = useAuth();
  const [liveItem, setLiveItem] = useState<AuctionItem | null>(null);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(team || null);
  const [purchasedRoster, setPurchasedRoster] = useState<TeamRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuctionObserverData();

    // Realtime subscription to auction_items, event_state, and team updates
    const channel = supabase
      .channel('team-auction-observer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_items' }, () => {
        loadAuctionObserverData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => {
        loadAuctionObserverData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadAuctionObserverData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id]);

  async function loadAuctionObserverData() {
    try {
      // 1. Fetch current live auction lot
      const { data: itemData } = await supabase
        .from('auction_items')
        .select('*, current_bidder:teams!auction_items_current_bidder_team_id_fkey(*)')
        .eq('status', 'live')
        .maybeSingle();

      setLiveItem((itemData as unknown as AuctionItem) || null);

      // 2. Fetch event state for timer & live banner
      const { data: stateData } = await supabase
        .from('event_state')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (stateData) setEventState(stateData as EventState);

      // 3. Fetch latest team data (budget & score)
      if (team?.id) {
        const { data: tData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', team.id)
          .single();

        if (tData) setMyTeam(tData as Team);

        // Fetch team's purchased lots
        const { data: rosterData } = await supabase
          .from('team_roster')
          .select('*, item:auction_items(*)')
          .eq('team_id', team.id)
          .order('created_at', { ascending: false });

        if (rosterData) setPurchasedRoster(rosterData as unknown as TeamRosterItem[]);
      }
    } catch (err) {
      console.error('Failed to load auction observation data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <LoadingSpinner size="lg" text="Connecting to Official Auction Broadcast..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Broadcast Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-surface)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="live" pulse>
              OFFICIAL BROADCAST
            </Badge>
            <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Live Technical Auction Arena
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            PRD Compliance Notice: All bids are officially placed and confirmed by the Tournament Auctioneer. This terminal is your live tactical monitor.
          </p>
        </div>

        {/* Team Budget Badge */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-gold)',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Your Available Balance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
            {myTeam?.remaining_budget ?? 1000} <span style={{ fontSize: '0.875rem' }}>credits</span>
          </div>
        </div>
      </div>

      {/* Main Broadcast Stage */}
      {liveItem ? (
        <div
          className="card"
          style={{
            padding: '2.5rem',
            border: '2px solid var(--border-gold)',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 17, 24, 0.95) 100%)',
            boxShadow: 'var(--shadow-gold)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <Badge variant="live" pulse style={{ marginBottom: '0.5rem' }}>
                ON STAGE NOW
              </Badge>
              <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', margin: '0.25rem 0' }}>
                {liveItem.name}
              </h2>
              <Badge variant="subtle">{liveItem.category}</Badge>
            </div>

            {/* Price Callout */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '1.25rem 2rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current High Bid
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--gold)', lineHeight: 1.1 }}>
                {liveItem.current_bid || liveItem.base_price} <span style={{ fontSize: '1.25rem' }}>cr</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#34d399', fontWeight: 600, marginTop: '0.35rem' }}>
                {liveItem.current_bidder?.id === myTeam?.id
                  ? '✨ YOUR SQUAD HOLDS THE HIGH BID! ✨'
                  : liveItem.current_bidder
                  ? `Leader: ${liveItem.current_bidder.name}`
                  : 'Starting Reserve Bid'}
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '720px', marginBottom: '1.5rem' }}>
            {liveItem.description || 'Verified technical asset featuring high-leverage competitive advantages.'}
          </p>

          {liveItem.skills && liveItem.skills.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Attributes:</span>
              {liveItem.skills.map((skill, idx) => (
                <Badge key={idx} variant="primary">{skill}</Badge>
              ))}
            </div>
          )}

          {eventState?.banner_message && (
            <div
              style={{
                marginTop: '2rem',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--gold)',
                fontSize: '0.875rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              📢 Auctioneer Announcement: {eventState.banner_message}
            </div>
          )}
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔨</div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Stage Intermission
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '460px', margin: '0 auto' }}>
            The Auctioneer is currently preparing the next technical lot. Real-time broadcast will commence immediately when the next lot is called.
          </p>
        </div>
      )}

      {/* Your Team's Acquired Roster */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          📦 Your Squad's Acquired Inventory ({purchasedRoster.length} Items)
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Assets acquired during this tournament edition. Total invested: <strong>{myTeam?.total_spent ?? 0} credits</strong>.
        </p>

        {purchasedRoster.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>
            Your team has not acquired any auction items yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {purchasedRoster.map((roster) => (
              <div
                key={roster.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    {roster.item?.name || 'Technical Lot'}
                  </h3>
                  <Badge variant="primary">{roster.purchase_price} cr</Badge>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Category: {roster.item?.category || 'Specialist'}
                </div>
                {roster.item?.skills && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {roster.item.skills.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.6875rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
