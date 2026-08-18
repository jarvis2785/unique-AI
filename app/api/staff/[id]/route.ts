import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { setStaffActive } from '@/lib/data/staff';
import { Errors } from '@/lib/utils/api';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role !== 'owner') return Errors.forbidden('Only the owner can manage staff accounts.');

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isActive !== 'boolean') {
    return Errors.badRequest('isActive must be a boolean.');
  }

  try {
    const supabase = createClient();
    await setStaffActive(supabase, params.id, body.isActive);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('owner account')) {
      return Errors.badRequest(err.message);
    }
    return Errors.internal();
  }
}
