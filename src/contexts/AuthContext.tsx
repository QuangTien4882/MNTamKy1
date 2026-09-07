import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useMemo } from 'react';
import { User, Role } from '../types';
import { supabase } from '../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- State and Dispatch combined ---
interface AuthContextType {
  currentUser: User | null;
  authLoading: boolean;
  approvalPending: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfile = (profile: any): User => ({
  id: profile.id,
  email: profile.email || '',
  displayName: profile.display_name,
  role: profile.role,
  assignedClass: profile.assigned_class || undefined,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [approvalPending, setApprovalPending] = useState(false);

  const loadProfile = useCallback(async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    if (!data) return null;
    return mapProfile(data);
  }, []);

  useEffect(() => {
    setAuthLoading(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      if (user) {
        const profile = await loadProfile(user.id);
        if (profile) {
          if (profile.role === Role.Pending) {
            // Registered but not yet approved by Admin -> block entry
            setApprovalPending(true);
            await supabase.auth.signOut();
            setCurrentUser(null);
          } else {
            setApprovalPending(false);
            setCurrentUser(profile);
          }
        } else {
          console.error('User profile not found in profiles for ID:', user.id);
          await supabase.auth.signOut();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Realtime subscription to keep role/assignedClass in sync
  useEffect(() => {
    if (!currentUser) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      channel = supabase
        .channel('profile-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` },
          async () => {
            const profile = await loadProfile(currentUser.id);
            if (profile) setCurrentUser(profile);
          }
        )
        .subscribe();
    };
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadProfile]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, pass: string, displayName: string) => {
    // display_name goes into user_metadata; the handle_new_user trigger stores it
    // in profiles.display_name automatically, so no profile update round-trip is needed.
    const { error, data } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;

    if (!data.session) {
      // Supabase has "Confirm email" enabled, which would send a confirmation link.
      // Per product rules sign-in must NOT depend on email confirmation — only Admin
      // approval gates access. Throw a marker the login page renders clearly.
      const e: any = new Error('EMAIL_CONFIRMATION_REQUIRED');
      e.code = 'EMAIL_CONFIRMATION_REQUIRED';
      throw e;
    }

    // Email confirmation is disabled -> a session was returned. The auth listener will
    // detect the 'Chưa duyệt' role, sign the user out and block until Admin approves.
    // Flag it here too for immediate feedback.
    setApprovalPending(true);
    await supabase.auth.signOut();
  }, []);

  const signOutUser = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const changePassword = useCallback(async (newPass: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    currentUser,
    authLoading,
    approvalPending,
    signInWithEmail,
    signUp,
    signOutUser,
    changePassword
  }), [currentUser, authLoading, approvalPending, signInWithEmail, signUp, signOutUser, changePassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
