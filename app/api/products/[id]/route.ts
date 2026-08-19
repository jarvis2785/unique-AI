import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteProduct, getProductDetailById, updateProduct, type ProductInput } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  try {
    const [user, product] = await Promise.all([getAuthedUser(), getProductDetailById(supabase, params.id, true)]);
    if (!user) return Errors.unauthenticated();
    if (!product) return Errors.notFound('Product not found.');
    if (user.role === 'staff') product.wholesalePrice = null;
    return NextResponse.json({ product });
  } catch (err) {
    console.error('[products/[id] GET] failed:', err);
    return Errors.internal();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return Errors.badRequest('Invalid request body.');

  const input: Partial<ProductInput> = {
    ...(body.skuCode !== undefined ? { skuCode: body.skuCode } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.brand !== undefined ? { brand: body.brand } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.variant !== undefined ? { variant: body.variant } : {}),
    ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
    ...(body.retailPrice !== undefined ? { retailPrice: body.retailPrice } : {}),
    ...(body.wholesalePrice !== undefined ? { wholesalePrice: body.wholesalePrice } : {}),
    ...(body.lowStockThreshold !== undefined ? { lowStockThreshold: body.lowStockThreshold } : {}),
  };

  try {
    const supabase = createClient();
    await updateProduct(supabase, params.id, input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[products/[id] PATCH] failed:', err);
    return Errors.internal();
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  try {
    const supabase = createClient();
    await deleteProduct(supabase, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[products/[id] DELETE] failed:', err);
    return Errors.internal();
  }
}
