import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOrGetTodayBrief } from '@/lib/data/brief';
import { Errors } from '@/lib/utils/api';

// The Claude call budgets up to 45s (see BRIEF_TIMEOUT_MS in lib/data/brief.ts);
// Vercel's default function timeout is well under that.
export const maxDuration = 60;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  const user = await getAuthedUser();
  return user?.role === 'owner' || user?.role === 'manager';
}

async function handle(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return Errors.unauthenticated();
  }

  try {
    // Uses the admin client: the Vercel cron invocation carries no user
    // session, and daily_briefs is written by the intelligence layer, not staff.
    const admin = createAdminClient();
    const brief = await generateOrGetTodayBrief(admin);
    return NextResponse.json({ brief });
  } catch (err) {
    console.error('[brief/generate] failed:', err);
    return Errors.internal('Could not generate today’s brief. Try again.');
  }
}

export const GET = handle;
export const POST = handle;
