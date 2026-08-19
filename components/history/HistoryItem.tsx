import { ChevronRight } from 'lucide-react';
import { formatDateTime, formatINR } from '@/lib/utils/format';
import type { PaymentMethod, Transaction, UserRole } from '@/lib/types/domain';

const TYPE_LABEL: Record<Transaction['type'], string> = {
  sale: 'Sold',
  purchase: 'Restocked',
  adjustment: 'Adjusted',
};

const BORDER_COLOR: Record<PaymentMethod, string> = {
  cash: 'border-payment-cash',
  upi: 'border-payment-upi',
  card: 'border-payment-card',
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
  const borderClass = transaction.paymentMethod ? BORDER_COLOR[transaction.paymentMethod] : 'border-elevated';

  return (
    <button
      onClick={() => onOpen?.(transaction)}
      className={`card-surface-bg flex w-full items-center gap-3 rounded-2xl border-l-4 ${borderClass} px-4 py-3.5 text-left transition active:scale-[0.98]`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-product-name">{transaction.productName}</p>
        {transaction.customerName && <p className="text-secondary-body mt-0.5">{transaction.customerName}</p>}
        <p className="text-secondary-body mt-0.5">
          {TYPE_LABEL[transaction.type]} {Math.abs(transaction.quantity)} &middot; {transaction.storeName}
          {viewerRole !== 'staff' ? ` · ${transaction.staffName}` : ''}
        </p>
        <p className="mt-1 text-[11px] text-text-muted">{formatDateTime(transaction.createdAt)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {transaction.totalAmount !== null && <span className="text-price text-primary">{formatINR(transaction.totalAmount)}</span>}
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </div>
    </button>
  );
}
