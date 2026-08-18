'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { formatINR } from '@/lib/utils/format';
import type { AuthedUser, PriceType, ProductDetail, Store } from '@/lib/types/domain';

interface MakePurchaseModalProps {
  product: ProductDetail;
  user: AuthedUser;
  onClose: () => void;
  onSuccess: (remainingQuantity: number) => void;
}

export function MakePurchaseModal({ product, user, onClose, onSuccess }: MakePurchaseModalProps) {
  const isStaff = user.role === 'staff';
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>(user.storeId ?? '');
  const [quantity, setQuantity] = useState(1);
  const [priceType, setPriceType] = useState<PriceType>('retail');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isStaff) return;
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        setStores(data.stores ?? []);
        if (!storeId && data.stores?.[0]) setStoreId(data.stores[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  const selectedStoreStock = useMemo(
    () => product.storeStock.find((s) => s.storeId === storeId)?.quantity ?? 0,
    [product.storeStock, storeId]
  );

  const storeName = useMemo(() => {
    if (isStaff) return product.storeStock.find((s) => s.storeId === user.storeId)?.storeName ?? 'Your store';
    return stores.find((s) => s.id === storeId)?.name ?? '';
  }, [isStaff, product.storeStock, stores, storeId, user.storeId]);

  const unitPrice =
    (priceType === 'wholesale' && product.wholesalePrice !== null ? product.wholesalePrice : product.retailPrice) ?? 0;
  const total = unitPrice * quantity;

  function adjustQuantity(delta: number) {
    setQuantity((q) => Math.max(1, q + delta));
  }

  async function handleConfirm() {
    if (!storeId) {
      setError('Select a store.');
      return;
    }
    if (product.retailPrice === null) {
      setError('This product has no price set yet.');
      return;
    }
    if (quantity > selectedStoreStock) {
      setError(`Only ${selectedStoreStock} units in stock at ${storeName}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId, storeId, quantity, priceType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not record the sale.');
      onSuccess(data.remainingQuantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the sale.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={submitting ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-t-3xl bg-surface p-5 pb-safe-bottom sm:rounded-3xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Make Purchase</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-tap w-tap items-center justify-center rounded-full text-text-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl bg-elevated/50 px-4 py-3">
          <p className="font-semibold text-text">{product.name}</p>
          {product.variant && <p className="text-sm text-text-muted">{product.variant}</p>}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-text-muted">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustQuantity(-1)}
              disabled={submitting}
              className="flex h-tap w-tap items-center justify-center rounded-xl border border-elevated text-text active:bg-elevated"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-tap w-20 rounded-xl border border-elevated bg-background text-center font-mono text-lg font-semibold text-text focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => adjustQuantity(1)}
              disabled={submitting}
              className="flex h-tap w-tap items-center justify-center rounded-xl border border-elevated text-text active:bg-elevated"
            >
              <Plus className="h-5 w-5" />
            </button>
            <span className="ml-auto text-sm text-text-muted">{selectedStoreStock} available</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-text-muted">Store</label>
          {isStaff ? (
            <div className="flex h-tap items-center rounded-xl border border-elevated bg-background/50 px-4 text-text">
              {storeName}
            </div>
          ) : (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={submitting}
              className="h-tap w-full rounded-xl border border-elevated bg-background px-4 text-text focus:border-primary focus:outline-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {!isStaff && product.wholesalePrice !== null && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-text-muted">Price</label>
            <div className="grid grid-cols-2 gap-2">
              {(['retail', 'wholesale'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPriceType(type)}
                  disabled={submitting}
                  className={`h-tap rounded-xl border text-sm font-medium capitalize transition ${
                    priceType === type
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-elevated text-text-muted'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-xl bg-elevated/50 px-4 py-3">
          <span className="text-sm text-text-muted">
            {formatINR(unitPrice)} × {quantity}
          </span>
          <span className="font-mono text-lg font-bold text-text">{formatINR(total)}</span>
        </div>

        {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="mt-5 flex h-tap w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Sale'}
        </button>
      </div>
    </div>
  );
}
