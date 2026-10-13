import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';
import { guessZone } from '../lib/time';

interface SessionState {
  user: User | null;
  profile: Profile | null;
  /** true until both the auth session and the signed-in user's profile are known */
  loading: boolean;
  /** re-reads the profile row, e.g. after settings were saved */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id, role, name, email, tz').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    // Callbacks must not await other supabase calls (auth lock), so they only store the user.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(prev => (prev?.id === session?.user.id && prev?.email === session?.user.email ? prev : (session?.user ?? null)));
      setAuthReady(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void fetchProfile(userId)
      .catch(() => null)
      .then(p => {
        if (!alive) return;
        setProfile(p);
        setProfileFor(userId);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setProfile(await fetchProfile(userId));
  }, [userId]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      profile: userId && profileFor === userId ? profile : null,
      loading: !authReady || (userId !== null && profileFor !== userId),
      refresh,
    }),
    [authReady, user, userId, profile, profileFor, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** Zone the viewer sees times in: the signed-in user's profile zone, a guest's browser zone. */
export function useViewerZone() {
  const { profile } = useSession();
  return profile?.tz ?? guessZone();
}
