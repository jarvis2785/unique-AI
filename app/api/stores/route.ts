import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { listStores } from '@/lib/data/stores';
import { Errors } from '@/lib/utils/api';

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  try {
    const supabase = createClient();
    const stores = await listStores(supabase);
    return NextResponse.json({ stores });
  } catch (err) {
    console.error('[stores GET] failed:', err);
    return Errors.internal();
  }
}
