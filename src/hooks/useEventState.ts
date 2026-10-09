import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EventState, Edition } from '../types/database';

const CACHE_KEY_EVENT_STATE = 'gcl_cached_event_state';

type BroadcastListener = (updates: Partial<EventState>) => void;
const broadcastListeners = new Set<BroadcastListener>();

// Dedicated realtime broadcast channel for cross-tab instant synchronization
export const syncChannel = supabase.channel('auction-broadcast-sync');

// Subscribe once at module level so callbacks are never registered after subscribe()
syncChannel
  .on('broadcast', { event: 'STATE_CHANGED' }, (payload) => {
    if (payload?.payload) {
      broadcastListeners.forEach((fn) => {
        try {
          fn(payload.payload);
        } catch (err) {
          console.warn('Error in broadcast listener:', err);
        }
      });
    }
  })
  .subscribe();

export function broadcastStateChange(updates: Partial<EventState>) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_EVENT_STATE);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify({ ...existing, ...updates }));
  } catch (err) {
    console.warn('Failed to cache event state to localStorage:', err);
  }

  syncChannel.send({
    type: 'broadcast',
    event: 'STATE_CHANGED',
    payload: updates,
  });
}

export function useEventState() {
  const [eventState, setEventState] = useState<EventState | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_EVENT_STATE);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let postgresChannel: ReturnType<typeof supabase.channel> | null = null;
    let editionsChannel: ReturnType<typeof supabase.channel> | null = null;

    // Register broadcast listener
    const handleBroadcast: BroadcastListener = (updates) => {
      if (isCancelled) return;
      setEventState((prev) => {
        const next = prev ? { ...prev, ...updates } : (updates as EventState);
        try {
          localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    broadcastListeners.add(handleBroadcast);

    async function setupSubscriptions() {
      try {
        // 1. Get current edition
        const { data: edData, error: edErr } = await supabase
          .from('editions')
          .select('*')
          .eq('is_current', true)
          .single();

        if (edErr || !edData) {
          console.warn('Error loading edition:', edErr?.message);
          if (!isCancelled) setLoading(false);
          return;
        }
        if (!isCancelled) setEdition(edData);

        // 2. Get event state for this edition
        const { data: stData, error: stErr } = await supabase
          .from('event_state')
          .select('*')
          .eq('edition_id', edData.id)
          .single();

        if (stErr || !stData) {
          console.warn('Error loading event state:', stErr?.message);
          if (!isCancelled) setLoading(false);
          return;
        }

        if (!isCancelled) {
          setEventState(stData as EventState);
          try {
            localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(stData));
          } catch {}
          setLoading(false);
        }

        if (isCancelled) return;

        // 3. Subscribe to postgres_changes with unique channel instance
        const subId = Math.random().toString(36).slice(2, 7);
        const stateChannelName = `event-state-changes-${edData.id}-${subId}`;
        postgresChannel = supabase
          .channel(stateChannelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'event_state',
              filter: `edition_id=eq.${edData.id}`,
            },
            (payload) => {
              if (payload.new && !isCancelled) {
                setEventState(payload.new as EventState);
                try {
                  localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(payload.new));
                } catch {}
              }
            }
          )
          .subscribe();

        // 4. Subscribe to editions table changes with unique channel instance
        const edChannelName = `editions-changes-${edData.id}-${subId}`;
        editionsChannel = supabase
          .channel(edChannelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'editions',
              filter: `id=eq.${edData.id}`,
            },
            (payload) => {
              if (payload.new && !isCancelled) {
                setEdition(payload.new as Edition);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error in setupSubscriptions:', err);
        if (!isCancelled) setLoading(false);
      }
    }

    setupSubscriptions();

    // Safety timeout: never hang loading indefinitely
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) setLoading(false);
    }, 3500);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY_EVENT_STATE && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setEventState(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      window.removeEventListener('storage', handleStorage);
      broadcastListeners.delete(handleBroadcast);
      if (postgresChannel) supabase.removeChannel(postgresChannel);
      if (editionsChannel) supabase.removeChannel(editionsChannel);
    };
  }, []);

  return { eventState, setEventState, edition, setEdition, loading };
}
