import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EventState, Edition } from '../types/database';

const CACHE_KEY_EVENT_STATE = 'gcl_cached_event_state';

// Dedicated realtime broadcast channel for cross-tab instant synchronization
export const syncChannel = supabase.channel('auction-broadcast-sync');
syncChannel.subscribe();

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
    async function loadInitialData() {
      // 1. Get current edition
      const { data: edData, error: edErr } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (edErr || !edData) {
        console.warn('Error loading edition:', edErr?.message);
        setLoading(false);
        return;
      }
      setEdition(edData);

      // 2. Get event state for this edition
      const { data: stData, error: stErr } = await supabase
        .from('event_state')
        .select('*')
        .eq('edition_id', edData.id)
        .single();

      if (stErr || !stData) {
        console.warn('Error loading event state:', stErr?.message);
        setLoading(false);
        return;
      }

      setEventState((prev) => {
        const merged = { ...stData, ...(prev || {}) };
        try {
          localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(merged));
        } catch {}
        return merged;
      });
      setLoading(false);

      // 3. Subscribe to postgres_changes
      const postgresChannel = supabase
        .channel('event-state-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_state',
            filter: `edition_id=eq.${edData.id}`,
          },
          (payload) => {
            if (payload.new) {
              setEventState(payload.new as EventState);
              try {
                localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(payload.new));
              } catch {}
            }
          }
        )
        .subscribe();

      // 4. Subscribe to broadcast sync (instant across tabs with zero RLS restrictions)
      const broadcastListener = syncChannel.on('broadcast', { event: 'STATE_CHANGED' }, (payload) => {
        if (payload?.payload) {
          setEventState((prev) => {
            const next = prev ? { ...prev, ...payload.payload } : (payload.payload as EventState);
            try {
              localStorage.setItem(CACHE_KEY_EVENT_STATE, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      });

      return () => {
        supabase.removeChannel(postgresChannel);
        broadcastListener.unsubscribe();
      };
    }

    loadInitialData();
  }, []);

  return { eventState, setEventState, edition, loading };
}
