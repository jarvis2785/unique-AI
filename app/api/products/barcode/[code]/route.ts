import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getProductByBarcode } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  const includeWholesale = user.role !== 'staff';

  try {
    const supabase = createClient();
    const product = await getProductByBarcode(supabase, params.code, includeWholesale);
    if (!product) return Errors.notFound('Product not in catalog.');
    return NextResponse.json({ product });
  } catch (err) {
    console.error('[products/barcode GET] failed:', err);
    return Errors.internal();
  }
}
