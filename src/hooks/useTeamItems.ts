import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TeamItem } from '../types/database';

export function getItemsCacheKey(editionId?: string) {
  return editionId ? `gcl_cached_items_${editionId}` : 'gcl_cached_items';
}

export function broadcastItemsChange(items: TeamItem[], editionId?: string) {
  try {
    const key = getItemsCacheKey(editionId || items[0]?.edition_id);
    localStorage.setItem(key, JSON.stringify(items));
    localStorage.setItem('gcl_cached_items', JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to cache items to localStorage:', err);
  }

  // Cross-tab sync via storage event and broadcast channel
  const ch = supabase.channel('auction-broadcast-sync');
  ch.send({
    type: 'broadcast',
    event: 'ITEMS_CHANGED',
    payload: items,
  });
}

export function useTeamItems(editionId: string | undefined) {
  const [items, setItems] = useState<TeamItem[]>(() => {
    try {
      const key = getItemsCacheKey(editionId);
      const cached = localStorage.getItem(key) || localStorage.getItem('gcl_cached_items');
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
    } else {
      const safeItems = data || [];
      setItems(safeItems as TeamItem[]);
      try {
        localStorage.setItem(getItemsCacheKey(editionId), JSON.stringify(safeItems));
      } catch {}
    }
    setLoading(false);
  }, [editionId]);

  useEffect(() => {
    if (!editionId) return;
    loadItems();

    const channelName = `team-items-${editionId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
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
      .on('broadcast', { event: 'ITEMS_CHANGED' }, (payload) => {
        if (payload?.payload && Array.isArray(payload.payload)) {
          const matching = payload.payload.filter(
            (it: TeamItem) => !editionId || it.edition_id === editionId
          );
          setItems(matching);
          try {
            localStorage.setItem(getItemsCacheKey(editionId), JSON.stringify(matching));
          } catch {}
        }
      })
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === getItemsCacheKey(editionId) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      supabase.removeChannel(channel);
    };
  }, [editionId, loadItems]);

  return { items, setItems, loading, reloadItems: loadItems };
}
