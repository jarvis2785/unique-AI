import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/data/dashboard';
import { Errors } from '@/lib/utils/api';

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  try {
    const supabase = createClient();
    const data = await getDashboardData(supabase, { role: user.role, userId: user.id });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[dashboard GET] failed:', err);
    return Errors.internal();
  }
}
