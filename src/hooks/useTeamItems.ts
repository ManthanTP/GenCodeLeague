import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TeamItem } from '../types/database';

export function useTeamItems(editionId: string | undefined) {
  const [items, setItems] = useState<TeamItem[]>([]);
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
    } else if (data) {
      setItems(data as TeamItem[]);
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
          filter: `edition_id=eq.${editionId}`
        },
        () => {
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editionId, loadItems]);

  return { items, loading, reloadItems: loadItems };
}
