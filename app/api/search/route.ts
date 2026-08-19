import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { fastSearchProducts, searchProducts } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

/**
 * `fast=1` skips the Claude round trip entirely — this is what the main
 * search screen calls first for instant results, then calls the default
 * (Claude-assisted) mode in parallel to silently upgrade them. Other callers
 * (stock adjustment picker, history filters) that don't need shorthand
 * expansion can use `fast=1` too for a snappier picker.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const fast = request.nextUrl.searchParams.get('fast') === '1';

  try {
    const supabase = createClient();
    const results = fast ? await fastSearchProducts(supabase, q) : await searchProducts(supabase, q);
    return NextResponse.json({ results });
  } catch (err) {
    // Search must never show a blank screen — surface an empty result set
    // rather than an error state the staff member can't act on.
    console.error('[search GET] failed:', err);
    return NextResponse.json({ results: [] });
  }
}
