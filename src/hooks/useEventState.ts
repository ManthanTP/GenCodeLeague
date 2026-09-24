import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EventState, Edition } from '../types/database';

export function useEventState() {
  const [eventState, setEventState] = useState<EventState | null>(null);
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
        console.error('Error loading edition', edErr);
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
        console.error('Error loading event state', stErr);
        setLoading(false);
        return;
      }
      setEventState(stData);
      setLoading(false);

      // 3. Subscribe to real-time changes
      const channel = supabase
        .channel('event-state-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_state',
            filter: `edition_id=eq.${edData.id}`
          },
          (payload) => {
            setEventState(payload.new as EventState);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    loadInitialData();
  }, []);

  return { eventState, edition, loading };
}
