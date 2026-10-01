import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardRevealEntry } from '../types/database';
import { syncChannel } from './useEventState';

const CACHE_KEY_LEADERBOARD_REVEAL = 'gcl_cached_leaderboard_reveal';

export function broadcastLeaderboardRevealChange(reveals: LeaderboardRevealEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY_LEADERBOARD_REVEAL, JSON.stringify(reveals));
  } catch (err) {
    console.warn('Failed to cache leaderboard reveal to localStorage:', err);
  }

  syncChannel.send({
    type: 'broadcast',
    event: 'LEADERBOARD_REVEAL_CHANGED',
    payload: reveals,
  });
}

export function useLeaderboardReveal(editionId: string | undefined, roundIndex: number = 0) {
  const [reveals, setReveals] = useState<LeaderboardRevealEntry[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_LEADERBOARD_REVEAL);
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
    } else if (data) {
      setReveals(data as LeaderboardRevealEntry[]);
      try {
        localStorage.setItem(CACHE_KEY_LEADERBOARD_REVEAL, JSON.stringify(data));
      } catch {}
    }
    setLoading(false);
  }, [editionId, roundIndex]);

  useEffect(() => {
    if (!editionId) return;
    loadReveals();

    const channel = supabase
      .channel(`leaderboard-reveals-${editionId}-${roundIndex}`)
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
      .subscribe();

    const broadcastListener = syncChannel.on('broadcast', { event: 'LEADERBOARD_REVEAL_CHANGED' }, (payload) => {
      if (payload?.payload && Array.isArray(payload.payload)) {
        const matching = payload.payload.filter(
          (r: LeaderboardRevealEntry) => r.round_index === roundIndex
        );
        setReveals(matching);
        try {
          localStorage.setItem(CACHE_KEY_LEADERBOARD_REVEAL, JSON.stringify(payload.payload));
        } catch {}
      }
    });

    return () => {
      supabase.removeChannel(channel);
      broadcastListener.unsubscribe();
    };
  }, [editionId, roundIndex, loadReveals]);

  return { reveals, setReveals, loading, reloadReveals: loadReveals };
}
