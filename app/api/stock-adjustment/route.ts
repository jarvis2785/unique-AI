import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { adjustStock } from '@/lib/data/transactions';
import { Errors } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.productId !== 'string' ||
    typeof body.storeId !== 'string' ||
    typeof body.newQuantity !== 'number' ||
    body.newQuantity < 0 ||
    !Number.isInteger(body.newQuantity)
  ) {
    return Errors.badRequest('productId, storeId, and a non-negative integer newQuantity are required.');
  }

  try {
    const supabase = createClient();
    await adjustStock(supabase, {
      productId: body.productId,
      storeId: body.storeId,
      staffId: user.id,
      newQuantity: body.newQuantity,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[stock-adjustment POST] failed:', err);
    return Errors.internal();
  }
}
