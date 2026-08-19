import { ChevronRight } from 'lucide-react';
import type { SearchResultProduct, StockStatus } from '@/lib/types/domain';

const BORDER_COLOR: Record<StockStatus, string> = {
  'in-stock': 'border-success',
  'low-stock': 'border-warning',
  'out-of-stock': 'border-danger',
};

function pillTone(storesInStock: number, storeCount: number): string {
  if (storesInStock === 0) return 'bg-danger/15 text-danger';
  if (storesInStock === storeCount) return 'bg-success/15 text-success';
  return 'bg-warning/15 text-warning';
}

export function ProductCard({ product, onTap }: { product: SearchResultProduct; onTap: () => void }) {
  const secondary = [product.category, product.variant].filter(Boolean).join(' — ');

  return (
    <button
      onClick={onTap}
      className={`card-surface-bg flex w-full items-center gap-3 rounded-2xl border-l-4 ${BORDER_COLOR[product.overallStatus]} px-4 py-3.5 text-left transition active:scale-[0.98]`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-product-name break-words">{product.name}</p>
        {secondary && <p className="text-secondary-body mt-1">{secondary}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`rounded-full px-2.5 py-1 text-badge ${pillTone(product.storesInStock, product.storeCount)}`}>
          {product.storesInStock}/{product.storeCount} stores
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </div>
    </button>
  );
}
