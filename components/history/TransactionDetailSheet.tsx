'use client';

import { Phone, X } from 'lucide-react';
import { formatDateTime, formatINR } from '@/lib/utils/format';
import type { Transaction } from '@/lib/types/domain';

const TYPE_LABEL: Record<Transaction['type'], string> = {
  sale: 'Sold',
  purchase: 'Restocked',
  adjustment: 'Adjusted',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-elevated py-3 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-text">{children}</span>
    </div>
  );
}

export function TransactionDetailSheet({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-surface p-5 pb-safe-bottom sm:rounded-3xl animate-slide-up">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-text">{transaction.productName}</h2>
            <p className="text-sm text-text-muted">{TYPE_LABEL[transaction.type]}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-tap w-tap shrink-0 items-center justify-center rounded-full text-text-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3">
          <Row label="Quantity">{Math.abs(transaction.quantity)} units</Row>
          <Row label="Store">{transaction.storeName}</Row>
          {transaction.unitPrice !== null && (
            <Row label="Price">
              {formatINR(transaction.unitPrice)} × {Math.abs(transaction.quantity)} = {formatINR(transaction.totalAmount ?? 0)}
            </Row>
          )}
          {transaction.paymentMethod && (
            <Row label="Payment Method">{PAYMENT_METHOD_LABEL[transaction.paymentMethod] ?? transaction.paymentMethod}</Row>
          )}
          {transaction.customerName && <Row label="Customer">{transaction.customerName}</Row>}
          {transaction.customerPhone && (
            <Row label="Phone">
              <a href={`tel:${transaction.customerPhone}`} className="inline-flex items-center gap-1 text-primary">
                <Phone className="h-3.5 w-3.5" />
                {transaction.customerPhone}
              </a>
            </Row>
          )}
          {transaction.notes && <Row label="Notes">{transaction.notes}</Row>}
          <Row label="Date & Time">{formatDateTime(transaction.createdAt)}</Row>
          <Row label="Recorded By">{transaction.staffName}</Row>
        </div>
      </div>
    </div>
  );
}
