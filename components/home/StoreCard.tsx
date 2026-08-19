import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { StoreSummary } from '@/lib/data/dashboard';

export function StoreCard({ store }: { store: StoreSummary }) {
  const hasLowStock = store.lowStockCount > 0;

  return (
    <div className="card-surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-product-name">{store.storeName}</p>
          <p className="text-secondary-body mt-0.5">{store.skuCount} SKUs</p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-badge ${
            hasLowStock ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
          }`}
        >
          {hasLowStock ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {store.lowStockCount} LOW
        </div>
      </div>
      <div className={`h-[3px] w-full ${hasLowStock ? 'bg-warning' : 'bg-success'}`} />
    </div>
  );
}
