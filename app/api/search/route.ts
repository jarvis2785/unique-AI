import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { searchProducts } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  const q = request.nextUrl.searchParams.get('q') ?? '';

  try {
    const supabase = createClient();
    const results = await searchProducts(supabase, q);
    return NextResponse.json({ results });
  } catch (err) {
    // Search must never show a blank screen — surface an empty result set
    // rather than an error state the staff member can't act on.
    console.error('[search GET] failed:', err);
    return NextResponse.json({ results: [] });
  }
}
