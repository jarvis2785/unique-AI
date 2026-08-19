import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { searchProducts } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

/**
 * Claude-assisted only now — the DB-only fast path queries Supabase directly
 * from the browser (see lib/data/searchShared.ts, used by the search page,
 * stock-adjustment picker, and history filters) and no longer goes through
 * this route at all. This endpoint exists purely for the background
 * shorthand-expansion upgrade ("ss a54" -> "Samsung A54") that silently
 * replaces results once it lands.
 *
 * Auth check and the search query run in parallel rather than sequentially:
 * the query itself doesn't depend on WHO the user is (results are identical
 * for any authenticated user), so there's no reason to block it on the auth
 * round trip finishing first — an unauthenticated request just discards the
 * result after both resolve.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const supabase = createClient();

  try {
    const [user, results] = await Promise.all([getAuthedUser(), searchProducts(supabase, q)]);
    if (!user) return Errors.unauthenticated();
    return NextResponse.json({ results });
  } catch (err) {
    // Search must never show a blank screen — surface an empty result set
    // rather than an error state the staff member can't act on.
    console.error('[search GET] failed:', err);
    return NextResponse.json({ results: [] });
  }
}
