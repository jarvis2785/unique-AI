import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getTodayBrief } from '@/lib/data/brief';
import { Errors } from '@/lib/utils/api';

export async function GET() {
  const supabase = createClient();

  try {
    const [user, brief] = await Promise.all([getAuthedUser(), getTodayBrief(supabase)]);
    if (!user) return Errors.unauthenticated();
    if (user.role === 'staff') return Errors.forbidden();
    return NextResponse.json({ brief });
  } catch (err) {
    console.error('[brief/today GET] failed:', err);
    return Errors.internal();
  }
}
