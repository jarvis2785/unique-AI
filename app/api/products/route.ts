import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createProduct, listProductsForManage, type ProductInput } from '@/lib/data/products';
import { Errors } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  const q = request.nextUrl.searchParams.get('q') ?? '';

  try {
    const supabase = createClient();
    const products = await listProductsForManage(supabase, q);
    return NextResponse.json({ products });
  } catch (err) {
    console.error('[products GET] failed:', err);
    return Errors.internal();
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  const body = await request.json().catch(() => null);
  if (!body || typeof body.skuCode !== 'string' || typeof body.name !== 'string') {
    return Errors.badRequest('skuCode and name are required.');
  }
  if (typeof body.retailPrice !== 'number' || typeof body.wholesalePrice !== 'number') {
    return Errors.badRequest('retailPrice and wholesalePrice must be numbers.');
  }

  const input: ProductInput = {
    skuCode: body.skuCode,
    name: body.name,
    brand: body.brand ?? null,
    category: body.category ?? null,
    variant: body.variant ?? null,
    barcode: body.barcode ?? null,
    retailPrice: body.retailPrice,
    wholesalePrice: body.wholesalePrice,
    lowStockThreshold: body.lowStockThreshold ?? undefined,
  };

  try {
    const supabase = createClient();
    const id = await createProduct(supabase, input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('duplicate')) {
      return Errors.badRequest('A product with that SKU already exists.');
    }
    return Errors.internal();
  }
}
