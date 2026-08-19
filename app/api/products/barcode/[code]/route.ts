import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getProductByBarcode } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

/**
 * Auth and the product lookup run in parallel: the query itself doesn't
 * depend on WHO's asking, only whether wholesale price should be included
 * in the response — so it's always fetched and stripped afterward for staff
 * rather than gating the query on the resolved role first.
 */
export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createClient();

  try {
    const [user, product] = await Promise.all([getAuthedUser(), getProductByBarcode(supabase, params.code, true)]);
    if (!user) return Errors.unauthenticated();
    if (!product) return Errors.notFound('Product not in catalog.');
    if (user.role === 'staff') product.wholesalePrice = null;
    return NextResponse.json({ product });
  } catch (err) {
    console.error('[products/barcode GET] failed:', err);
    return Errors.internal();
  }
}
