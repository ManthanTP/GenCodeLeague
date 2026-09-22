import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isCaptain: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
    isAdmin: false,
    isCaptain: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }, []);

  const updateState = useCallback((user: User | null, session: Session | null, profile: Profile | null) => {
    const role = profile?.role ?? null;
    setState({
      user,
      profile,
      session,
      isLoading: false,
      isAuthenticated: !!user,
      role,
      isAdmin: role === 'admin' || role === 'super_admin',
      isCaptain: role === 'captain',
    });
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        updateState(session.user, session, profile);
      } else {
        updateState(null, null, null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        updateState(session.user, session, profile);
      } else if (event === 'SIGNED_OUT') {
        updateState(null, null, null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        updateState(session.user, session, profile);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, updateState]);

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
      updateState(state.user, state.session, profile);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
