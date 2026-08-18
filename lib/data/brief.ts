import type { DB } from './db';
import { callClaudeJSON } from '@/lib/claude/client';
import { BRIEF_SYSTEM_PROMPT } from '@/lib/claude/prompts';
import type { Json } from '@/lib/types/database.types';
import type { DailyBrief, DailyBriefContent } from '@/lib/types/domain';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const BRIEF_TIMEOUT_MS = 45000;
const MAX_ROWS_PER_SECTION = 50;

function istDateString(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
}

export function todayIST(): string {
  return istDateString(new Date());
}

function yesterdayRangeUtc(): { fromIso: string; toIso: string } {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istMidnightToday = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
  const istMidnightYesterday = new Date(istMidnightToday.getTime() - 24 * 60 * 60 * 1000);

  return {
    fromIso: new Date(istMidnightYesterday.getTime() - IST_OFFSET_MS).toISOString(),
    toIso: new Date(istMidnightToday.getTime() - IST_OFFSET_MS).toISOString(),
  };
}

function toDailyBrief(row: { id: string; brief_date: string; content: unknown; generated_at: string }): DailyBrief {
  return {
    id: row.id,
    briefDate: row.brief_date,
    content: row.content as DailyBriefContent,
    createdAt: row.generated_at,
  };
}

export async function getTodayBrief(supabase: DB): Promise<DailyBrief | null> {
  const { data, error } = await supabase
    .from('daily_briefs')
    .select('id, brief_date, content, generated_at')
    .eq('brief_date', todayIST())
    .maybeSingle();

  if (error) throw error;
  return data ? toDailyBrief(data) : null;
}

/** Idempotent: returns today's brief if one already exists instead of re-generating. */
export async function generateOrGetTodayBrief(supabase: DB): Promise<DailyBrief> {
  const existing = await getTodayBrief(supabase);
  if (existing) return existing;

  const { fromIso, toIso } = yesterdayRangeUtc();

  const [lowStock, deadStock, salesVelocity, yesterdaySales] = await Promise.all([
    supabase.from('low_stock_alerts').select('*'),
    supabase.from('dead_stock').select('*'),
    supabase.from('sales_velocity').select('*'),
    supabase
      .from('transactions')
      .select('quantity, unit_price, product_id, store_id, products(model, sku_code), stores(name)')
      .eq('type', 'sale')
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
  ]);

  // Capped and sorted most-urgent-first — sending all 369+ low-stock rows raw
  // blew well past the Claude timeout budget, and the brief only ever wants
  // the handful of items actually worth Nikhil's attention today.
  const lowStockRows = [...(lowStock.data ?? [])]
    .sort((a, b) => (a as { current_stock?: number }).current_stock! - (b as { current_stock?: number }).current_stock!)
    .slice(0, MAX_ROWS_PER_SECTION);
  const deadStockRows = (deadStock.data ?? []).slice(0, MAX_ROWS_PER_SECTION);
  const salesVelocityRows = (salesVelocity.data ?? []).slice(0, MAX_ROWS_PER_SECTION);

  const dataPayload = {
    low_stock: lowStockRows,
    dead_stock: deadStockRows,
    sales_velocity: salesVelocityRows,
    yesterday_sales: yesterdaySales.data ?? [],
  };

  const content = await callClaudeJSON<DailyBriefContent>({
    system: BRIEF_SYSTEM_PROMPT,
    prompt: `Today is ${todayIST()} (IST). Here is the raw inventory data:\n\n${JSON.stringify(dataPayload)}`,
    timeoutMs: BRIEF_TIMEOUT_MS,
    maxTokens: 2048,
  });

  const { data: inserted, error: insertError } = await supabase
    .from('daily_briefs')
    .insert({ brief_date: todayIST(), content: content as unknown as Json })
    .select('id, brief_date, content, generated_at')
    .single();

  if (insertError) throw insertError;
  return toDailyBrief(inserted);
}
