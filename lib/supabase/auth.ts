import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { AuthedUser } from '@/lib/types/domain';

/**
 * Server-only. Resolves the signed-in user's profile (role, store) for use in
 * Server Components and API routes. Returns null if unauthenticated, deactivated,
 * or missing a profile row.
 *
 * Wrapped in React's `cache()` so multiple calls within the same request (e.g.
 * the app-shell layout and the page it renders both calling this) collapse
 * into one execution instead of each paying their own round trip. This does
 * NOT dedupe across separate requests — a page's SSR render and a later
 * client-side fetch() to an API route are different requests, each still
 * calls this fresh, which is why the getSession() swap below matters too.
 *
 * Uses getSession() instead of getUser() — getSession() reads the JWT from
 * cookies locally with no network call, where getUser() always revalidates
 * against Supabase's Auth server. Supabase's own docs flag getSession() as
 * unsuitable for authorization decisions made directly off it, but that
 * concern doesn't apply here: the actual authorization boundary is the
 * `profiles` fetch immediately below, which goes through PostgREST and is
 * subject to real RLS + JWT signature verification regardless of what a
 * tampered cookie claims. A forged session can't produce a real profile row.
 */
export const getAuthedUser = cache(async (): Promise<AuthedUser | null> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, store_id, is_active')
    .eq('id', session.user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    storeId: profile.store_id,
  };
});

export async function requireAuthedUser(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}
