import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../types/database';
import { syncChannel } from './useEventState';

const CACHE_KEY_TEAMS = 'gcl_cached_teams';

export function broadcastTeamsChange(teams: Team[]) {
  try {
    localStorage.setItem(CACHE_KEY_TEAMS, JSON.stringify(teams));
  } catch (err) {
    console.warn('Failed to cache teams to localStorage:', err);
  }

  syncChannel.send({
    type: 'broadcast',
    event: 'TEAMS_CHANGED',
    payload: teams,
  });
}

export function useTeams(editionId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_TEAMS);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!editionId) return;

    async function loadTeams() {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('edition_id', editionId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading teams', error);
      } else if (data && data.length > 0) {
        setTeams(data);
        try {
          localStorage.setItem(CACHE_KEY_TEAMS, JSON.stringify(data));
        } catch {}
      }
      setLoading(false);

      const channel = supabase
        .channel('teams-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teams',
            filter: `edition_id=eq.${editionId}`,
          },
          () => {
            loadTeams();
          }
        )
        .subscribe();

      const broadcastListener = syncChannel.on('broadcast', { event: 'TEAMS_CHANGED' }, (payload) => {
        if (payload?.payload && Array.isArray(payload.payload)) {
          setTeams(payload.payload);
          try {
            localStorage.setItem(CACHE_KEY_TEAMS, JSON.stringify(payload.payload));
          } catch {}
        }
      });

      return () => {
        supabase.removeChannel(channel);
        broadcastListener.unsubscribe();
      };
    }

    loadTeams();
  }, [editionId]);

  return { teams, setTeams, loading };
}
