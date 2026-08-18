'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { ProductDetail, SearchResultProduct } from '@/lib/types/domain';

export default function StockAdjustmentPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [options, setOptions] = useState<SearchResultProduct[]>([]);
  const [selected, setSelected] = useState<ProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setOptions([]);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((data) => setOptions(data.results ?? []))
      .catch(() => setOptions([]));
  }, [debouncedQuery]);

  async function selectProduct(productId: string) {
    setLoadingDetail(true);
    setOptions([]);
    setQuery('');
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSelected(data.product);
      const nextDraft: Record<string, string> = {};
      for (const s of data.product.storeStock) nextDraft[s.storeId] = String(s.quantity);
      setDraft(nextDraft);
    } catch {
      showToast('Could not load that product.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function saveStore(storeId: string) {
    if (!selected) return;
    const newQuantity = Number(draft[storeId]);
    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      showToast('Enter a valid, non-negative quantity.', 'error');
      return;
    }

    setSavingStoreId(storeId);
    try {
      const res = await fetch('/api/stock-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selected.productId, storeId, newQuantity }),
      });
      if (!res.ok) throw new Error();

      setSelected((prev) =>
        prev
          ? {
              ...prev,
              storeStock: prev.storeStock.map((s) => (s.storeId === storeId ? { ...s, quantity: newQuantity } : s)),
            }
          : prev
      );
      showToast('Stock updated.', 'success');
    } catch {
      showToast('Could not update stock.', 'error');
    } finally {
      setSavingStoreId(null);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-elevated bg-background/95 px-4 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center gap-3 pt-3">
          <Link href="/manage" className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted active:bg-elevated">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-text">Stock Adjustment</h1>
        </div>
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a product to correct…"
            className="h-11 w-full rounded-xl border border-elevated bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          {options.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-elevated bg-surface shadow-lg">
              {options.map((p) => (
                <button
                  key={p.productId}
                  onClick={() => selectProduct(p.productId)}
                  className="block w-full px-3.5 py-2.5 text-left text-sm text-text hover:bg-elevated"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {loadingDetail && <LoadingSpinner label="Loading…" />}

        {!loadingDetail && !selected && (
          <EmptyState
            icon={SlidersHorizontal}
            title="Physical count correction"
            description="Search for a product above, then set the exact quantity at each store."
          />
        )}

        {!loadingDetail && selected && (
          <div>
            <p className="font-semibold text-text">{selected.name}</p>
            <p className="mb-4 text-sm text-text-muted">{selected.skuCode}</p>

            <div className="space-y-2.5">
              {selected.storeStock.map((store) => (
                <div key={store.storeId} className="flex items-center gap-3 rounded-xl border border-elevated bg-surface px-4 py-3">
                  <span className="flex-1 text-sm text-text">{store.storeName}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft[store.storeId] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [store.storeId]: e.target.value }))}
                    className="h-10 w-20 rounded-lg border border-elevated bg-background text-center font-mono text-text focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => saveStore(store.storeId)}
                    disabled={savingStoreId === store.storeId || draft[store.storeId] === String(store.quantity)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-40"
                  >
                    {savingStoreId === store.storeId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
