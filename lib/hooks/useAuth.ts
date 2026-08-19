'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthedUser } from '@/lib/types/domain';

interface UseAuthResult {
  user: AuthedUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    // getSession() reads the session from local storage/cookies — no
    // network call, unlike getUser() which always revalidates against
    // Supabase's Auth server. Safe here for the same reason it's safe
    // server-side: the profiles fetch right below is the real
    // authorization boundary, going through RLS + JWT verification at
    // the Postgres layer regardless of what a stale/tampered session
    // claims locally.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, store_id, is_active')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.is_active) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser({
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      storeId: profile.store_id,
    });
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return { user, loading, signOut };
}
