import type { DB } from './db';
import type { Store } from '@/lib/types/domain';

export async function listStores(supabase: DB): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select('id, name, location, type').order('name');
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, location: s.location, type: s.type }));
}

/** CSV import quantities default to the Wholesale store (see spec). */
export async function getWholesaleStoreId(supabase: DB): Promise<string> {
  const stores = await listStores(supabase);
  const wholesale = stores.find((s) => s.type === 'wholesale');
  if (!wholesale) throw new Error('Wholesale store not found');
  return wholesale.id;
}

/**
 * Maps a store to the pivoted column `stock_by_store` uses for it.
 * Confirmed columns are stock_retail / stock_wholesale / stock_shinai — a
 * 'both'-type store (Unique Sales, Shinai) is the only one left over once
 * retail/wholesale are matched, so it's assumed to be stock_shinai.
 */
export function stockColumnForStore(store: Store): 'stock_retail' | 'stock_wholesale' | 'stock_shinai' {
  if (store.type === 'retail') return 'stock_retail';
  if (store.type === 'wholesale') return 'stock_wholesale';
  return 'stock_shinai';
}
