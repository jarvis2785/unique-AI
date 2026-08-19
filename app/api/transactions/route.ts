import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getProductDetailById } from '@/lib/data/products';
import { InsufficientStockError, recordSale } from '@/lib/data/transactions';
import { listTransactions, type TransactionFilters } from '@/lib/data/transactions';
import { Errors } from '@/lib/utils/api';
import type { PaymentMethod, PriceType } from '@/lib/types/domain';

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card'];

export async function GET(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  const params = request.nextUrl.searchParams;
  const filters: TransactionFilters = {
    storeId: params.get('storeId') ?? undefined,
    staffId: params.get('staffId') ?? undefined,
    productId: params.get('productId') ?? undefined,
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo: params.get('dateTo') ?? undefined,
  };

  try {
    const supabase = createClient();
    const transactions = await listTransactions(supabase, { role: user.role, userId: user.id }, filters);
    return NextResponse.json({ transactions });
  } catch (err) {
    console.error('[transactions GET] failed:', err);
    return Errors.internal();
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();

  const body = await request.json().catch(() => null);
  if (!body || typeof body.productId !== 'string' || typeof body.quantity !== 'number') {
    return Errors.badRequest('productId and quantity are required.');
  }
  if (body.quantity <= 0 || !Number.isInteger(body.quantity)) {
    return Errors.badRequest('quantity must be a positive whole number.');
  }

  // Staff always sell from their own assigned store and at retail price —
  // enforced here, not just hidden in the UI, since a client can send anything.
  const isStaff = user.role === 'staff';
  const storeId = isStaff ? user.storeId : (body.storeId ?? user.storeId);
  const priceType: PriceType = isStaff ? 'retail' : body.priceType === 'wholesale' ? 'wholesale' : 'retail';

  if (!storeId) {
    return Errors.badRequest('No store selected.');
  }

  const paymentMethod: PaymentMethod = VALID_PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash';
  const customerName = typeof body.customerName === 'string' ? body.customerName : null;
  const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone : null;
  const notes = typeof body.notes === 'string' ? body.notes : null;

  try {
    const supabase = createClient();
    const product = await getProductDetailById(supabase, body.productId, true);
    if (!product) return Errors.notFound('Product not found.');

    const unitPrice = priceType === 'wholesale' ? product.wholesalePrice ?? product.retailPrice : product.retailPrice;
    if (unitPrice === null) {
      return Errors.badRequest('This product has no price set yet — add one from Manage first.');
    }

    const remaining = await recordSale(supabase, {
      productId: body.productId,
      storeId,
      staffId: user.id,
      quantity: body.quantity,
      priceType,
      unitPrice,
      customerName,
      customerPhone,
      paymentMethod,
      notes,
    });

    return NextResponse.json({ remainingQuantity: remaining });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return Errors.badRequest(`Only ${err.available} units in stock.`);
    }
    console.error('[transactions POST] failed:', err);
    return Errors.internal();
  }
}
