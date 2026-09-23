import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole, Team } from '../types/database';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  team: Team | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isTeamLeader: boolean;
  isCaptain: boolean; // Backwards compatible alias for isTeamLeader
}

export interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTeam: () => Promise<void>;
}

export const defaultAuthContext: AuthContextType = {
  user: null,
  profile: null,
  team: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  role: null,
  isAdmin: false,
  isTeamLeader: false,
  isCaptain: false,
  signUp: async () => ({ error: new Error('Auth not initialized') }),
  signIn: async () => ({ error: new Error('Auth not initialized') }),
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshTeam: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    team: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
    isAdmin: false,
    isTeamLeader: false,
    isCaptain: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  }, []);

  const fetchTeam = useCallback(async (userId: string): Promise<Team | null> => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*, edition:editions(*)')
        .or(`team_leader_id.eq.${userId},captain_id.eq.${userId}`)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data as unknown as Team;
    } catch {
      return null;
    }
  }, []);

  const updateState = useCallback(
    (user: User | null, session: Session | null, profile: Profile | null, team: Team | null) => {
      const role = profile?.role ?? null;
      const isAdmin = role === 'admin' || role === 'super_admin';
      const isTeamLeader = role === 'team_leader' || role === 'captain' || !!team;

      setState({
        user,
        profile,
        team,
        session,
        isLoading: false,
        isAuthenticated: !!user,
        role,
        isAdmin,
        isTeamLeader,
        isCaptain: isTeamLeader,
      });
    },
    []
  );

  const loadUserData = useCallback(
    async (user: User | null, session: Session | null) => {
      if (!user) {
        updateState(null, null, null, null);
        return;
      }
      const [profile, team] = await Promise.all([
        fetchProfile(user.id),
        fetchTeam(user.id),
      ]);
      updateState(user, session, profile, team);
    },
    [fetchProfile, fetchTeam, updateState]
  );

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          await loadUserData(session.user, session);
        } else {
          updateState(null, null, null, null);
        }
      })
      .catch(() => {
        updateState(null, null, null, null);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await loadUserData(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        updateState(null, null, null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, updateState]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      updateState(state.user, state.session, profile, state.team);
    }
  };

  const refreshTeam = async () => {
    if (state.user) {
      const team = await fetchTeam(state.user.id);
      updateState(state.user, state.session, state.profile, team);
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signUp, signIn, signOut, refreshProfile, refreshTeam }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
