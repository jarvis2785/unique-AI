import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { StoreSummary } from '@/lib/data/dashboard';

export function StoreCard({ store }: { store: StoreSummary }) {
  const hasLowStock = store.lowStockCount > 0;

  return (
    <div className="min-w-[150px] flex-1 rounded-xl border border-elevated bg-surface px-4 py-3.5">
      <p className="truncate text-sm font-semibold text-text">{store.storeName}</p>
      <p className="mt-1 font-mono text-xs text-text-muted">{store.skuCount} SKUs</p>
      <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${hasLowStock ? 'text-warning' : 'text-success'}`}>
        {hasLowStock ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        {store.lowStockCount} low
      </div>
    </div>
  );
}
