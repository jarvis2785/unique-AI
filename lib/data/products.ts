import type { DB } from './db';
import { listStores, stockColumnForStore } from './stores';
import {
  BARCODE_PATTERN,
  STOCK_VIEW_SELECT,
  displayName,
  scoredSearch,
  toSearchResult,
  toStockStatus,
  type StockByStoreRow,
} from './searchShared';
import type { ProductDetail, SearchResultProduct, StoreStock } from '@/lib/types/domain';
import { normalizeSearchQuery } from '@/lib/claude/search';

export { fastSearchProducts } from './searchShared';

async function toStoreStock(supabase: DB, row: StockByStoreRow): Promise<StoreStock[]> {
  const stores = await listStores(supabase);
  const pivotValue: Record<string, number | null> = {
    stock_retail: row.stock_retail,
    stock_wholesale: row.stock_wholesale,
    stock_shinai: row.stock_shinai,
  };

  return stores.map((store) => ({
    storeId: store.id,
    storeName: store.name,
    quantity: pivotValue[stockColumnForStore(store)] ?? 0,
  }));
}

/**
 * `model` bakes the variant's marketing name into the same string as the
 * device (e.g. "BORDERLESS PRIVACY GLASS IP-15PRO", "SUPER D IP 15PROMAX",
 * "BORDER LESS  IP-15PRO" — note the inconsistent spacing/wording even
 * within one variant). There's no separate device-identifier column, so this
 * strips known marketing phrases and non-alphanumeric characters to get a
 * best-effort normalized device key ("IP15PRO") for grouping siblings. It's
 * a heuristic over messy free text, not a real relationship — see
 * SCHEMA_ASSUMPTIONS.md for known misses.
 */
const VARIANT_MARKETING_TERMS = [
  'BORDERLESS PRIVACY GLASS',
  'BORDERLESS',
  'BORDER LESS',
  'PRIVACY GLASS',
  'SUPER D GLASS',
  'SUPER D',
  'UV PRIVACY GLASS',
  'UV GLASS',
  'MATTE GLASS',
  'ONE MINUTE',
  'TEMPERED GLASS',
  'GLASS',
  'ESD',
];

function normalizedDeviceKey(model: string): string {
  let stripped = model.toUpperCase();
  for (const term of VARIANT_MARKETING_TERMS) {
    stripped = stripped.replaceAll(term, ' ');
  }
  return stripped.replace(/[^A-Z0-9]/g, '');
}

async function findVariants(supabase: DB, row: StockByStoreRow): Promise<string[]> {
  if (!row.category || !row.variant || !row.model) return row.variant ? [row.variant] : [];

  const deviceKey = normalizedDeviceKey(row.model);
  if (!deviceKey) return [row.variant];

  let query = supabase
    .from('stock_by_store')
    .select('variant, model')
    .eq('category', row.category)
    .not('variant', 'is', null);

  if (row.brand) query = query.eq('brand', row.brand);

  const { data } = await query;
  if (!data) return [row.variant];

  const siblings = new Set<string>([row.variant]);
  for (const sibling of data) {
    if (!sibling.variant || !sibling.model) continue;
    if (normalizedDeviceKey(sibling.model) === deviceKey) siblings.add(sibling.variant);
  }

  return Array.from(siblings).sort();
}

async function toProductDetail(supabase: DB, row: StockByStoreRow, includeWholesale: boolean): Promise<ProductDetail> {
  const [storeStock, variants] = await Promise.all([toStoreStock(supabase, row), findVariants(supabase, row)]);

  return {
    productId: row.product_id,
    skuCode: row.sku_code,
    name: displayName(row),
    brand: row.brand,
    category: row.category,
    variant: row.variant,
    barcode: row.barcode,
    retailPrice: row.retail_price,
    wholesalePrice: includeWholesale ? row.wholesale_price : null,
    lowStockThreshold: row.low_stock_threshold,
    storeStock,
    variants,
    overallStatus: toStockStatus(row.stock_status),
    storesInStock: storeStock.filter((s) => s.quantity > 0).length,
    storeCount: storeStock.length,
  };
}

/**
 * Search never returns an error to the caller — a blank results screen is
 * never acceptable. Claude expands shorthand ("ss" -> "Samsung") with a hard
 * 3s budget; its output and the raw query both run through the same scored
 * matcher, so a Claude failure only loses the shorthand expansion, not the
 * search itself.
 *
 * This is the slow, Claude-assisted path. The search page calls
 * `fastSearchProducts` first for instant results and fires this in parallel
 * to silently upgrade them — never awaited before showing something on
 * screen. See PROBLEM 1 in the redesign brief for why: awaiting this before
 * any DB query made every keystroke pay for a full Claude round trip.
 */
export async function searchProducts(supabase: DB, rawQuery: string): Promise<SearchResultProduct[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  if (BARCODE_PATTERN.test(trimmed)) {
    const byBarcode = await scoredSearch(supabase, trimmed);
    if (byBarcode.length > 0) return byBarcode.map(toSearchResult);
  }

  let rows: StockByStoreRow[] = [];

  try {
    const normalized = await normalizeSearchQuery(trimmed);
    if (normalized.search_terms) rows = await scoredSearch(supabase, normalized.search_terms);
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    rows = await scoredSearch(supabase, trimmed);
  }

  return rows.map(toSearchResult);
}

export async function getProductDetailById(
  supabase: DB,
  productId: string,
  includeWholesale: boolean
): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from('stock_by_store')
    .select(STOCK_VIEW_SELECT)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toProductDetail(supabase, data as unknown as StockByStoreRow, includeWholesale);
}

export async function getProductByBarcode(
  supabase: DB,
  barcode: string,
  includeWholesale: boolean
): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from('stock_by_store')
    .select(STOCK_VIEW_SELECT)
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toProductDetail(supabase, data as unknown as StockByStoreRow, includeWholesale);
}

export interface ProductManageRow {
  id: string;
  skuCode: string;
  name: string;
  brand: string | null;
  category: string | null;
  variant: string | null;
  barcode: string | null;
  retailPrice: number | null;
  wholesalePrice: number | null;
  lowStockThreshold: number;
}

export async function listProductsForManage(supabase: DB, query: string, limit = 50): Promise<ProductManageRow[]> {
  let q = supabase
    .from('products')
    .select('id, sku_code, model, brand, category, variant, barcode, retail_price, wholesale_price, low_stock_threshold')
    .eq('is_active', true)
    .order('model')
    .limit(limit);

  const trimmed = query.trim();
  if (trimmed) {
    q = q.or(`model.ilike.%${trimmed}%,sku_code.ilike.%${trimmed}%,barcode.ilike.%${trimmed}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    skuCode: p.sku_code,
    name: displayName(p),
    brand: p.brand,
    category: p.category,
    variant: p.variant,
    barcode: p.barcode,
    retailPrice: p.retail_price,
    wholesalePrice: p.wholesale_price,
    lowStockThreshold: p.low_stock_threshold,
  }));
}

export interface ProductInput {
  skuCode: string;
  /** Stored in `products.model` (and mirrored into `description`) — there's no separate `name` column. */
  name: string;
  brand?: string | null;
  category?: string | null;
  variant?: string | null;
  barcode?: string | null;
  retailPrice: number;
  wholesalePrice: number;
  lowStockThreshold?: number;
}

export async function createProduct(supabase: DB, input: ProductInput): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      sku_code: input.skuCode,
      model: input.name,
      description: input.name,
      brand: input.brand ?? null,
      category: input.category ?? null,
      variant: input.variant ?? null,
      barcode: input.barcode ?? null,
      retail_price: input.retailPrice,
      wholesale_price: input.wholesalePrice,
      low_stock_threshold: input.lowStockThreshold ?? 5,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateProduct(supabase: DB, id: string, input: Partial<ProductInput>): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      ...(input.skuCode !== undefined ? { sku_code: input.skuCode } : {}),
      ...(input.name !== undefined ? { model: input.name, description: input.name } : {}),
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.variant !== undefined ? { variant: input.variant } : {}),
      ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
      ...(input.retailPrice !== undefined ? { retail_price: input.retailPrice } : {}),
      ...(input.wholesalePrice !== undefined ? { wholesale_price: input.wholesalePrice } : {}),
      ...(input.lowStockThreshold !== undefined ? { low_stock_threshold: input.lowStockThreshold } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Soft delete — `products.is_active = false` — rather than a hard DELETE, since past transactions still reference the row. */
export async function deleteProduct(supabase: DB, id: string): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

/** Upserts on sku_code for CSV import. Does not touch inventory — the caller inserts a 'purchase' transaction for the quantity. */
export async function upsertProductFromImport(supabase: DB, input: ProductInput): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .upsert(
      {
        sku_code: input.skuCode,
        model: input.name,
        description: input.name,
        brand: input.brand ?? null,
        category: input.category ?? null,
        variant: input.variant ?? null,
        barcode: input.barcode ?? null,
        retail_price: input.retailPrice,
        wholesale_price: input.wholesalePrice,
        low_stock_threshold: input.lowStockThreshold ?? 5,
      },
      { onConflict: 'sku_code' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
