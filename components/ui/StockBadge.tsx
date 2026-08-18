import type { StockStatus } from '@/lib/types/domain';

const CONFIG: Record<StockStatus, { dot: string; label: string; text: string }> = {
  'in-stock': { dot: 'bg-success', label: 'In Stock', text: 'text-success' },
  'low-stock': { dot: 'bg-warning', label: 'Low Stock', text: 'text-warning' },
  'out-of-stock': { dot: 'bg-danger', label: 'Out of Stock', text: 'text-danger' },
};

export function StockBadge({ status, showLabel = false }: { status: StockStatus; showLabel?: boolean }) {
  const config = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
      {showLabel && config.label}
    </span>
  );
}
