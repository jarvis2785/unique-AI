import type { DB } from './db';
import { listStores, stockColumnForStore } from './stores';
import type { ProductDetail, SearchResultProduct, StockStatus, StoreStock } from '@/lib/types/domain';
import { normalizeSearchQuery } from '@/lib/claude/search';

const STOCK_VIEW_SELECT =
  'product_id, sku_code, brand, model, category, variant, retail_price, wholesale_price, low_stock_threshold, barcode, stock_retail, stock_wholesale, stock_shinai, stock_status';

interface StockByStoreRow {
  product_id: string;
  sku_code: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  low_stock_threshold: number;
  barcode: string | null;
  stock_retail: number | null;
  stock_wholesale: number | null;
  stock_shinai: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

/** `products.model` carries the full messy display name (e.g. "MATTE GLASS IP 15PRO") — there's no separate `name` column. */
function displayName(row: { model: string | null; sku_code: string }): string {
  return row.model?.trim() || row.sku_code;
}

function toStockStatus(value: StockByStoreRow['stock_status']): StockStatus {
  if (value === 'out_of_stock') return 'out-of-stock';
  if (value === 'low_stock') return 'low-stock';
  return 'in-stock';
}

function toSearchResult(row: StockByStoreRow): SearchResultProduct {
  const perStore = [row.stock_retail, row.stock_wholesale, row.stock_shinai];
  return {
    productId: row.product_id,
    skuCode: row.sku_code,
    name: displayName(row),
    brand: row.brand,
    category: row.category,
    variant: row.variant,
    overallStatus: toStockStatus(row.stock_status),
    storesInStock: perStore.filter((q) => (q ?? 0) > 0).length,
    storeCount: perStore.length,
  };
}

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

const RESULT_LIMIT = 20;
const BARCODE_PATTERN = /^\d{6,}$/;

function tokenize(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

/**
 * Staff type shorthand with no separators ("ip15pro") against data stored
 * with spaces/hyphens ("IP 15PRO", "IP-15PRO"). A plain `%token%` ILIKE
 * misses that entirely. Splitting the token into letter/digit chunks and
 * joining them with `%` lets ILIKE skip over whatever separator (or none)
 * the catalog actually used, while still requiring the chunks in order.
 */
function chunkPattern(token: string): string {
  const chunks = token.match(/[a-z]+|\d+/gi) ?? [token];
  return `%${chunks.join('%')}%`;
}

const PER_TOKEN_CANDIDATE_LIMIT = 100;

/**
 * The one matcher behind both the Claude-assisted and dumb-fallback paths.
 * `products.search_vector` looked like the "proper" tool for this, but
 * empirically it stores runs like "15PRO" as a single lexeme — a query for
 * "15 pro", or "iPhone 15 Pro" (Claude's own literal expansion of "ip15pro"
 * per its prompt), matches nothing against catalog text written "IP 15PRO".
 *
 * Instead this runs each token as its own chunked-ILIKE query against
 * stock_by_store (letter/digit chunks joined by `%`, so "ip15pro" still
 * matches "IP 15PRO" / "IP-15PRO" regardless of separator) and ranks
 * products by how many tokens matched, rather than requiring all of them —
 * verified against the live catalog: when Claude expands "ip15pro" to
 * "iPhone 15 Pro" and "iPhone" matches nothing, the product still surfaces
 * top-ranked on the 3 tokens that do match ("matte", "15", "pro").
 */
async function scoredSearch(supabase: DB, query: string): Promise<StockByStoreRow[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const perToken = await Promise.all(
    tokens.map((token) => {
      const pattern = chunkPattern(token);
      return supabase
        .from('stock_by_store')
        .select(STOCK_VIEW_SELECT)
        .or(`model.ilike.${pattern},sku_code.ilike.${pattern},brand.ilike.${pattern},barcode.ilike.${pattern}`)
        .order('model')
        .limit(PER_TOKEN_CANDIDATE_LIMIT);
    })
  );

  const scored = new Map<string, { row: StockByStoreRow; score: number }>();
  for (const { data, error } of perToken) {
    if (error) throw error;
    for (const row of (data ?? []) as unknown as StockByStoreRow[]) {
      const existing = scored.get(row.product_id);
      if (existing) existing.score += 1;
      else scored.set(row.product_id, { row, score: 1 });
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_LIMIT)
    .map((entry) => entry.row);
}

/**
 * DB-only, no Claude round trip — this is the "instant" path. A chunked-ILIKE
 * scan over 694 rows resolves in well under 100ms, so this alone is fast
 * enough to be the primary result the user sees; `searchProducts` below is
 * the slower Claude-assisted upgrade that runs alongside it, not before it.
 */
export async function fastSearchProducts(supabase: DB, rawQuery: string): Promise<SearchResultProduct[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];
  const rows = await scoredSearch(supabase, trimmed);
  return rows.map(toSearchResult);
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
