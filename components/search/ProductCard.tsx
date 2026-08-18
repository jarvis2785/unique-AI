import { ChevronRight } from 'lucide-react';
import { StockBadge } from '@/components/ui/StockBadge';
import type { SearchResultProduct } from '@/lib/types/domain';

export function ProductCard({ product, onTap }: { product: SearchResultProduct; onTap: () => void }) {
  const secondary = [product.category, product.variant].filter(Boolean).join(' — ');

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl border border-elevated bg-surface px-4 py-3.5 text-left transition active:scale-[0.99] active:bg-elevated"
      style={{ minHeight: '64px' }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{product.name}</p>
        {secondary && <p className="mt-0.5 truncate text-sm text-text-muted">{secondary}</p>}
      </div>
      <StockBadge status={product.overallStatus} />
      <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
    </button>
  );
}
