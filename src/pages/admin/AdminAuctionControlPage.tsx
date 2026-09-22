import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuctionEvent, AuctionItem, Team, Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminAuctionControlPage() {
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuctionEvent | null>(null);
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Item State
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Specialist Engineer');
  const [basePrice, setBasePrice] = useState(500);
  const [skillsStr, setSkillsStr] = useState('React, Rust, Distributed Systems');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAuctionEvents();
  }, []);

  async function loadAuctionEvents() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      // Find or create auction event for current edition
      let { data: evData } = await supabase.from('auction_events').select('*').eq('edition_id', edData.id).maybeSingle();

      if (!evData) {
        // Create an auction event if none exists
        const { data: createdEv } = await supabase
          .from('auction_events')
          .insert({
            edition_id: edData.id,
            starting_budget: 10000,
            bid_increment: 100,
            timer_duration: 30,
            status: 'active',
          })
          .select()
          .single();
        evData = createdEv;
      }

      if (evData) {
        setSelectedEvent(evData as AuctionEvent);
        loadItems(evData.id);
      }
    }
    setLoading(false);
  }

  async function loadItems(eventId: string) {
    const { data } = await supabase
      .from('auction_items')
      .select('*')
      .eq('auction_event_id', eventId)
      .order('sort_order', { ascending: true });

    if (data) setItems(data as AuctionItem[]);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !itemName.trim()) return;

    setSaving(true);
    try {
      const skills = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      await supabase.from('auction_items').insert({
        auction_event_id: selectedEvent.id,
        name: itemName.trim(),
        description,
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
      setSaving(false);
    }
  }

  async function handleSetLive(item: AuctionItem) {
    if (!selectedEvent) return;
    // Set all other items in this event to available/withdrawn
    await supabase
      .from('auction_items')
      .update({ status: 'available' })
      .eq('auction_event_id', selectedEvent.id)
      .eq('status', 'live');

    // Set this item live
    await supabase.from('auction_items').update({ status: 'live' }).eq('id', item.id);
    await loadItems(selectedEvent.id);
  }

  async function handleMarkSold(itemId: string) {
    if (!selectedEvent) return;
    await supabase.from('auction_items').update({ status: 'sold' }).eq('id', itemId);
    await loadItems(selectedEvent.id);
  }

  async function handleMarkUnsold(itemId: string) {
    if (!selectedEvent) return;
    await supabase.from('auction_items').update({ status: 'unsold' }).eq('id', itemId);
    await loadItems(selectedEvent.id);
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading auction console..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="live" pulse>AUCTION MASTER DESK</Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Budget: $10,000 &bull; Increment: $100
            </span>
          </div>
          <h1 style={{ fontSize: '2rem' }}>Live Auction Control Console</h1>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Create Auction Lot
        </Button>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th>Lot Name</th>
              <th>Category</th>
              <th>Base Price</th>
              <th>Status</th>
              <th>Console Controls</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.description}</div>
                </td>
                <td>
                  <Badge variant="subtle">{item.category}</Badge>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                  ${item.base_price.toLocaleString()}
                </td>
                <td>
                  <Badge
                    variant={
                      item.status === 'live'
                        ? 'live'
                        : item.status === 'sold'
                        ? 'qualified'
                        : item.status === 'unsold'
                        ? 'eliminated'
                        : 'subtle'
                    }
                    pulse={item.status === 'live'}
                  >
                    {item.status.toUpperCase()}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {item.status !== 'live' && (
                      <Button variant="outline" size="sm" onClick={() => handleSetLive(item)}>
                        Put on Stage
                      </Button>
                    )}
                    {item.status === 'live' && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleMarkSold(item.id)}>
                          Hammer: SOLD
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleMarkUnsold(item.id)}>
                          UNSOLD
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Lot Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Technical Auction Lot">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lot / Specialist Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Distributed Systems Engineer / High-Yield GPU Cluster"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Specialist Engineer</option>
                <option>Technology Stack License</option>
                <option>Infrastructure Modifier</option>
                <option>Secret Algorithmic Asset</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Base Price ($)</label>
              <input
                type="number"
                className="form-input"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Specialist Skills (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of technical advantages..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Create Lot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
