import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../types/database';

export function getTeamsCacheKey(editionId?: string) {
  return editionId ? `gcl_cached_teams_${editionId}` : 'gcl_cached_teams';
}

export function broadcastTeamsChange(teams: Team[], editionId?: string) {
  try {
    const key = getTeamsCacheKey(editionId || teams[0]?.edition_id);
    localStorage.setItem(key, JSON.stringify(teams));
    localStorage.setItem('gcl_cached_teams', JSON.stringify(teams));
  } catch (err) {
    console.warn('Failed to cache teams to localStorage:', err);
  }

  const ch = supabase.channel('auction-broadcast-sync');
  ch.send({
    type: 'broadcast',
    event: 'TEAMS_CHANGED',
    payload: teams,
  });
}

export function useTeams(editionId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const key = getTeamsCacheKey(editionId);
      const cached = localStorage.getItem(key) || localStorage.getItem('gcl_cached_teams');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    if (!editionId) return;
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('edition_id', editionId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading teams', error);
    } else if (data) {
      setTeams(data);
      try {
        localStorage.setItem(getTeamsCacheKey(editionId), JSON.stringify(data));
      } catch {}
    }
    setLoading(false);
  }, [editionId]);

  useEffect(() => {
    if (!editionId) return;

    loadTeams();

    const channelName = `teams-${editionId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
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
      .on('broadcast', { event: 'TEAMS_CHANGED' }, (payload) => {
        if (payload?.payload && Array.isArray(payload.payload)) {
          const matching = payload.payload.filter(
            (t: Team) => !editionId || t.edition_id === editionId
          );
          if (matching.length > 0) {
            setTeams(matching);
            try {
              localStorage.setItem(getTeamsCacheKey(editionId), JSON.stringify(matching));
            } catch {}
          }
        }
      })
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === getTeamsCacheKey(editionId) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setTeams(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      supabase.removeChannel(channel);
    };
  }, [editionId, loadTeams]);

  return { teams, setTeams, loading, reloadTeams: loadTeams };
}
