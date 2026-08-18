import { createClient } from '@/lib/supabase/server';
import type { AuthedUser } from '@/lib/types/domain';

/**
 * Server-only. Resolves the signed-in user's profile (role, store) for use in
 * Server Components and API routes. Returns null if unauthenticated, deactivated,
 * or missing a profile row.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, store_id, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    storeId: profile.store_id,
  };
}

export async function requireAuthedUser(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}
