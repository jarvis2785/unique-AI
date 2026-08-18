import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { upsertProductFromImport } from '@/lib/data/products';
import { recordPurchase } from '@/lib/data/transactions';
import { getWholesaleStoreId } from '@/lib/data/stores';
import { Errors } from '@/lib/utils/api';
import type { MappedProductRow } from '@/lib/utils/csv';

const BATCH_SIZE = 100;

interface ImportRequestBody {
  rows: MappedProductRow[];
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return Errors.unauthenticated();
  if (user.role === 'staff') return Errors.forbidden();

  const body = (await request.json().catch(() => null)) as ImportRequestBody | null;
  if (!body || !Array.isArray(body.rows)) {
    return Errors.badRequest('rows must be an array.');
  }

  const supabase = createClient();

  let wholesaleStoreId: string;
  try {
    wholesaleStoreId = await getWholesaleStoreId(supabase);
  } catch (err) {
    console.error('[import POST] could not resolve wholesale store:', err);
    return Errors.internal('Could not find the Wholesale store to import stock into.');
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < body.rows.length; i += BATCH_SIZE) {
    const batch = body.rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      if (!row.skuCode || !row.name) {
        skipped++;
        continue;
      }

      try {
        const productId = await upsertProductFromImport(supabase, {
          skuCode: row.skuCode,
          name: row.name,
          brand: row.brand,
          category: row.category,
          variant: row.variant,
          barcode: row.barcode,
          retailPrice: row.retailPrice,
          wholesalePrice: row.wholesalePrice,
        });

        if (row.quantity > 0) {
          await recordPurchase(supabase, {
            productId,
            storeId: wholesaleStoreId,
            staffId: user.id,
            quantity: row.quantity,
          });
        }

        imported++;
      } catch (err) {
        skipped++;
        errors.push(`${row.skuCode}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: body.rows.length });
}
