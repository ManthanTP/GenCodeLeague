import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TeamItem } from '../types/database';
import { syncChannel } from './useEventState';

const CACHE_KEY_ITEMS = 'gcl_cached_items';

export function broadcastItemsChange(items: TeamItem[]) {
  try {
    localStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to cache items to localStorage:', err);
  }

  syncChannel.send({
    type: 'broadcast',
    event: 'ITEMS_CHANGED',
    payload: items,
  });
}

export function useTeamItems(editionId: string | undefined) {
  const [items, setItems] = useState<TeamItem[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_ITEMS);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!editionId) return;
    const { data, error } = await supabase
      .from('team_items')
      .select('*')
      .eq('edition_id', editionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error loading team items:', error.message);
    } else if (data && data.length > 0) {
      setItems(data as TeamItem[]);
      try {
        localStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(data));
      } catch {}
    }
    setLoading(false);
  }, [editionId]);

  useEffect(() => {
    if (!editionId) return;
    loadItems();

    const channel = supabase
      .channel('team-items-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_items',
          filter: `edition_id=eq.${editionId}`,
        },
        () => {
          loadItems();
        }
      )
      .subscribe();

    const broadcastListener = syncChannel.on('broadcast', { event: 'ITEMS_CHANGED' }, (payload) => {
      if (payload?.payload && Array.isArray(payload.payload)) {
        setItems(payload.payload);
        try {
          localStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(payload.payload));
        } catch {}
      }
    });

    return () => {
      supabase.removeChannel(channel);
      broadcastListener.unsubscribe();
    };
  }, [editionId, loadItems]);

  return { items, setItems, loading, reloadItems: loadItems };
}
