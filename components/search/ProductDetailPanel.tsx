'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { stockStatusForQuantity } from '@/lib/types/domain';
import { formatINR } from '@/lib/utils/format';
import type { ProductDetail } from '@/lib/types/domain';

const DOT_COLOR = {
  'in-stock': 'bg-success',
  'low-stock': 'bg-warning',
  'out-of-stock': 'bg-danger',
} as const;

interface ProductDetailPanelProps {
  productId: string;
  onClose: () => void;
  onMakePurchase: (product: ProductDetail) => void;
}

export function ProductDetailPanel({ productId, onClose, onMakePurchase }: ProductDetailPanelProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to load product');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setProduct(data.product);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Could not load this product.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const outOfStockEverywhere = product ? product.storeStock.every((s) => s.quantity <= 0) : false;
  const notPriced = product ? product.retailPrice === null : false;
  const purchaseDisabled = outOfStockEverywhere || notPriced;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />

      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface pb-safe-bottom animate-slide-up">
        <div className="sticky top-0 flex items-center justify-between border-b border-elevated bg-surface px-5 py-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-elevated" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-3 flex h-tap w-tap items-center justify-center rounded-full text-text-muted hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && <LoadingSpinner label="Loading product…" />}

        {error && !loading && (
          <div className="px-5 py-10 text-center">
            <p className="text-text-muted">{error}</p>
          </div>
        )}

        {product && !loading && (
          <div className="px-5 pb-6 pt-2">
            <h2 className="text-xl font-bold text-text">{product.name}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {[product.category, product.variant].filter(Boolean).join(' — ')}
            </p>
            <p className="mt-1 font-mono text-xs text-text-muted">SKU: {product.skuCode}</p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Stock across stores
              </p>
              <div className="space-y-2">
                {product.storeStock.map((store) => {
                  const status = stockStatusForQuantity(store.quantity, product.lowStockThreshold);
                  return (
                    <div
                      key={store.storeId}
                      className="flex items-center justify-between rounded-lg bg-elevated/50 px-3 py-2.5"
                    >
                      <span className="text-sm text-text">{store.storeName}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-text">{store.quantity}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR[status]}`} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {product.variants.length > 1 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Variants available
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <span
                      key={v}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        v === product.variant
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-elevated text-text-muted'
                      }`}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Retail Price</span>
                <span className="font-mono text-lg font-semibold text-text">
                  {product.retailPrice !== null ? formatINR(product.retailPrice) : 'Not set'}
                </span>
              </div>
              {product.wholesalePrice !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Wholesale Price</span>
                  <span className="font-mono text-lg font-semibold text-text">
                    {formatINR(product.wholesalePrice)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => onMakePurchase(product)}
              disabled={purchaseDisabled}
              className="mt-6 flex h-tap w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted"
            >
              {outOfStockEverywhere ? 'Out of Stock Everywhere' : notPriced ? 'Price Not Set' : 'Make Purchase'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
