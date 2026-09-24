import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../types/database';

export function useTeams(editionId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>([]);
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
      } else if (data) {
        setTeams(data);
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
            filter: `edition_id=eq.${editionId}`
          },
          (payload) => {
            // Simplified handling: just reload all teams to maintain sort order easily
            // For a production app with many teams, you might want to patch the array
            loadTeams();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    loadTeams();
  }, [editionId]);

  return { teams, loading };
}
