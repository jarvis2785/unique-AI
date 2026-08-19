import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStaffAccount, listStaff, type CreateStaffInput } from '@/lib/data/staff';
import { Errors } from '@/lib/utils/api';
import type { UserRole } from '@/lib/types/domain';

const VALID_ROLES: UserRole[] = ['owner', 'manager', 'staff'];

export async function GET() {
  const supabase = createClient();

  try {
    // Manager can view staff to filter History, but only the owner manages accounts (POST/PATCH below).
    const [user, staff] = await Promise.all([getAuthedUser(), listStaff(supabase)]);
    if (!user) return Errors.unauthenticated();
    if (user.role === 'staff') return Errors.forbidden();
    return NextResponse.json({ staff });
  } catch (err) {
    console.error('[staff GET] failed:', err);
    return Errors.internal();
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role !== 'owner') return Errors.forbidden('Only the owner can add staff accounts.');

  const body = await request.json().catch(() => null);
  if (!body || typeof body.fullName !== 'string' || !body.fullName.trim()) {
    return Errors.badRequest('fullName is required.');
  }
  if (typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
    return Errors.badRequest('pin must be 4 to 6 digits.');
  }
  if (!VALID_ROLES.includes(body.role)) {
    return Errors.badRequest('role must be owner, manager, or staff.');
  }

  const input: CreateStaffInput = {
    fullName: body.fullName.trim(),
    pin: body.pin,
    role: body.role,
    storeId: body.storeId ?? null,
  };

  try {
    const adminClient = createAdminClient();
    const id = await createStaffAccount(adminClient, input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[staff POST] failed:', err);
    return Errors.internal();
  }
}
