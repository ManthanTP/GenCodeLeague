import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function getProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (!isCancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!isCancelled) {
          if (error) {
            console.error('Error fetching profile', error);
          } else {
            setProfile(data);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in useAuth getProfile:', err);
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    getProfile();

    // Safety timeout: never hang loading for more than 3 seconds
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setLoading(false);
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile();
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
