import type { DB } from './db';
import type { SearchResultProduct, StockStatus } from '@/lib/types/domain';

/**
 * Client-safe: no `next/headers`, no Claude/Anthropic SDK, nothing
 * server-only. This module is imported directly into 'use client'
 * components so the fast search path can query Supabase from the browser
 * instead of round-tripping through a Next.js API route — see FIX 2 in the
 * production-lag diagnosis. Keep it that way; put anything server-only
 * (Claude normalization, etc.) in products.ts instead.
 */

export const STOCK_VIEW_SELECT =
  'product_id, sku_code, brand, model, category, variant, retail_price, wholesale_price, low_stock_threshold, barcode, stock_retail, stock_wholesale, stock_shinai, stock_status';

export interface StockByStoreRow {
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
export function displayName(row: { model: string | null; sku_code: string }): string {
  return row.model?.trim() || row.sku_code;
}

export function toStockStatus(value: StockByStoreRow['stock_status']): StockStatus {
  if (value === 'out_of_stock') return 'out-of-stock';
  if (value === 'low_stock') return 'low-stock';
  return 'in-stock';
}

export function toSearchResult(row: StockByStoreRow): SearchResultProduct {
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

const RESULT_LIMIT = 20;
export const BARCODE_PATTERN = /^\d{6,}$/;

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
 * products by how many tokens matched, rather than requiring all of them.
 */
export async function scoredSearch(supabase: DB, query: string): Promise<StockByStoreRow[]> {
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
 * DB-only, no Claude round trip, and no Next.js API route — this is the
 * "instant" path, called directly from the browser with the client-side
 * Supabase instance. Phone -> Supabase -> Phone, one hop each way, instead
 * of Phone -> Vercel -> Supabase -> Vercel -> Phone. RLS still applies
 * exactly as it does server-side, since it's the same anon key + session.
 */
export async function fastSearchProducts(supabase: DB, rawQuery: string): Promise<SearchResultProduct[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];
  const rows = await scoredSearch(supabase, trimmed);
  return rows.map(toSearchResult);
}
