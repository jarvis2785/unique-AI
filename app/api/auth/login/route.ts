import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { InvalidPinError, signInByProfileId } from '@/lib/data/staff';
import { Errors } from '@/lib/utils/api';

/** Public — this *is* the login endpoint. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== 'string' || typeof body.pin !== 'string') {
    return Errors.badRequest('profileId and pin are required.');
  }

  try {
    const admin = createAdminClient();
    // The SSR server client's cookie adapter writes the session onto this
    // request's response, which is what actually signs the browser in.
    const sessionClient = createClient();
    await signInByProfileId(admin, sessionClient, body.profileId, body.pin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidPinError) {
      return Errors.badRequest('Incorrect PIN.');
    }
    return Errors.internal();
  }
}
