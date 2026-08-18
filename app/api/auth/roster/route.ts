import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listActiveRoster } from '@/lib/data/staff';
import { Errors } from '@/lib/utils/api';

/**
 * Public — this is the pre-login "tap your name" screen, so it can't require
 * a session. Only exposes id + full name, nothing sensitive.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const roster = await listActiveRoster(admin);
    return NextResponse.json({ roster });
  } catch (err) {
    console.error('[auth/roster GET] failed:', err);
    return Errors.internal();
  }
}
