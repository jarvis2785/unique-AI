import type { DB } from './db';
import { listStores } from './stores';
import { listTransactions } from './transactions';
import type { Transaction } from '@/lib/types/domain';

export interface StoreSummary {
  storeId: string;
  storeName: string;
  skuCount: number;
  lowStockCount: number;
}

export interface TodayMetrics {
  totalSalesInr: number;
  totalUnits: number;
}

export interface AlertsSummary {
  lowStockCount: number;
  deadStockCount: number;
}

export interface DashboardData {
  stores: StoreSummary[];
  today: TodayMetrics;
  alerts: AlertsSummary;
  recentTransactions: Transaction[];
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardData(supabase: DB, viewer: { role: 'owner' | 'manager'; userId: string }): Promise<DashboardData> {
  const [stores, productCountRes, lowStockRes, deadStockRes, todaySalesRes, recentTransactions] = await Promise.all([
    listStores(supabase),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('low_stock_alerts').select('store_name'),
    supabase.from('dead_stock').select('store_name'),
    supabase
      .from('transactions')
      .select('quantity, unit_price')
      .eq('type', 'sale')
      .gte('created_at', startOfTodayIso()),
    listTransactions(supabase, viewer, {}, 10),
  ]);

  const skuCount = productCountRes.count ?? 0;

  // low_stock_alerts / dead_stock are keyed by store_name, not store_id.
  const lowStockByStore = new Map<string, number>();
  for (const row of lowStockRes.data ?? []) {
    lowStockByStore.set(row.store_name, (lowStockByStore.get(row.store_name) ?? 0) + 1);
  }

  const storeSummaries: StoreSummary[] = stores.map((store) => ({
    storeId: store.id,
    storeName: store.name,
    skuCount,
    lowStockCount: lowStockByStore.get(store.name) ?? 0,
  }));

  const todaySales = todaySalesRes.data ?? [];
  const today: TodayMetrics = {
    totalSalesInr: todaySales.reduce((sum, t) => sum + (t.unit_price ?? 0) * t.quantity, 0),
    totalUnits: todaySales.reduce((sum, t) => sum + t.quantity, 0),
  };

  const alerts: AlertsSummary = {
    lowStockCount: (lowStockRes.data ?? []).length,
    deadStockCount: (deadStockRes.data ?? []).length,
  };

  return { stores: storeSummaries, today, alerts, recentTransactions };
}
