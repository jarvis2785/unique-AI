import { formatDateTime, formatINR } from '@/lib/utils/format';
import type { Transaction, UserRole } from '@/lib/types/domain';

const TYPE_LABEL: Record<Transaction['type'], string> = {
  sale: 'Sold',
  purchase: 'Restocked',
  adjustment: 'Adjusted',
};

export function HistoryItem({
  transaction,
  viewerRole,
  onOpen,
}: {
  transaction: Transaction;
  viewerRole: UserRole;
  onOpen?: (transaction: Transaction) => void;
}) {
  return (
    <button
      onClick={() => onOpen?.(transaction)}
      className="w-full rounded-xl border border-elevated bg-surface px-4 py-3.5 text-left transition active:scale-[0.99] active:bg-elevated"
    >
      <p className="font-semibold text-text">{transaction.productName}</p>
      <p className="mt-0.5 text-sm text-text-muted">
        {TYPE_LABEL[transaction.type]} {Math.abs(transaction.quantity)} units — {transaction.storeName}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
        {transaction.totalAmount !== null && (
          <>
            <span className="font-mono font-medium text-text">{formatINR(transaction.totalAmount)}</span>
            <span>—</span>
          </>
        )}
        <span>{formatDateTime(transaction.createdAt)}</span>
        {viewerRole !== 'staff' && (
          <>
            <span>—</span>
            <span>{transaction.staffName}</span>
          </>
        )}
      </div>
    </button>
  );
}
