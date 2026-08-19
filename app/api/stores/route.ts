import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { listStores } from '@/lib/data/stores';
import { Errors } from '@/lib/utils/api';

export async function GET() {
  const supabase = createClient();

  try {
    const [user, stores] = await Promise.all([getAuthedUser(), listStores(supabase)]);
    if (!user) return Errors.unauthenticated();
    return NextResponse.json({ stores });
  } catch (err) {
    console.error('[stores GET] failed:', err);
    return Errors.internal();
  }
}
