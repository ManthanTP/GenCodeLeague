import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardRevealEntry } from '../types/database';

export function getLeaderboardRevealCacheKey(editionId?: string, roundIndex: number = 0) {
  return editionId ? `gcl_cached_reveals_${editionId}_${roundIndex}` : `gcl_cached_reveals_${roundIndex}`;
}

export function broadcastLeaderboardRevealChange(reveals: LeaderboardRevealEntry[], editionId?: string, roundIndex: number = 0) {
  try {
    const key = getLeaderboardRevealCacheKey(editionId || reveals[0]?.edition_id, roundIndex);
    localStorage.setItem(key, JSON.stringify(reveals));
    localStorage.setItem('gcl_cached_leaderboard_reveal', JSON.stringify(reveals));
  } catch (err) {
    console.warn('Failed to cache leaderboard reveal to localStorage:', err);
  }

  const ch = supabase.channel('auction-broadcast-sync');
  ch.send({
    type: 'broadcast',
    event: 'LEADERBOARD_REVEAL_CHANGED',
    payload: reveals,
  });
}

export function useLeaderboardReveal(editionId: string | undefined, roundIndex: number = 0) {
  const [reveals, setReveals] = useState<LeaderboardRevealEntry[]>(() => {
    try {
      const key = getLeaderboardRevealCacheKey(editionId, roundIndex);
      const cached = localStorage.getItem(key) || localStorage.getItem('gcl_cached_leaderboard_reveal');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (r: LeaderboardRevealEntry) => (!editionId || r.edition_id === editionId) && r.round_index === roundIndex
          );
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const loadReveals = useCallback(async () => {
    if (!editionId) return;
    const { data, error } = await supabase
      .from('leaderboard_reveals')
      .select('id, edition_id, round_index, position, team_id, team_name, is_revealed, revealed_by, revealed_at, created_at')
      .eq('edition_id', editionId)
      .eq('round_index', roundIndex)
      .order('position', { ascending: true });

    if (error) {
      console.warn('Error loading leaderboard reveals:', error.message);
    } else {
      const safeData = data || [];
      setReveals(safeData as LeaderboardRevealEntry[]);
      try {
        localStorage.setItem(getLeaderboardRevealCacheKey(editionId, roundIndex), JSON.stringify(safeData));
      } catch {}
    }
    setLoading(false);
  }, [editionId, roundIndex]);

  useEffect(() => {
    if (!editionId) return;
    loadReveals();

    const channelName = `reveals-${editionId}-${roundIndex}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_reveals',
          filter: `edition_id=eq.${editionId}`,
        },
        () => {
          loadReveals();
        }
      )
      .on('broadcast', { event: 'LEADERBOARD_REVEAL_CHANGED' }, (payload) => {
        if (payload?.payload && Array.isArray(payload.payload)) {
          const matching = payload.payload.filter(
            (r: LeaderboardRevealEntry) => r.round_index === roundIndex
          );
          setReveals(matching);
          try {
            localStorage.setItem(getLeaderboardRevealCacheKey(editionId, roundIndex), JSON.stringify(matching));
          } catch {}
        }
      })
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === getLeaderboardRevealCacheKey(editionId, roundIndex) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setReveals(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      supabase.removeChannel(channel);
    };
  }, [editionId, roundIndex, loadReveals]);

  return { reveals, setReveals, loading, reloadReveals: loadReveals };
}
