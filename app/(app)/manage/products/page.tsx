'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Trash2 } from 'lucide-react';
import { ProductForm } from '@/components/manage/ProductForm';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatINR } from '@/lib/utils/format';
import type { ProductManageRow } from '@/lib/data/products';

export default function ManageProductsPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [products, setProducts] = useState<ProductManageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductManageRow | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => showToast('Could not load products.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(product: ProductManageRow) {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Product deleted.', 'success');
      load();
    } catch {
      showToast('Could not delete the product.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-5 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/manage" className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition active:scale-[0.98] active:bg-elevated">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-page-title text-[20px]">Products</h1>
          <button
            onClick={() => setEditing('new')}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <div className="px-5 py-4">
        {loading && <SkeletonCardList count={6} />}

        {!loading && products.length === 0 && (
          <EmptyState icon={Package} title="No products found" description="Try a different search, or add one." />
        )}

        {!loading && products.length > 0 && (
          <div className="space-y-2.5">
            {products.map((product) => (
              <div key={product.id} className="card-surface rounded-2xl px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(product)}>
                    <p className="text-product-name break-words">{product.name}</p>
                    <p className="text-secondary-body mt-0.5">
                      {product.skuCode} {product.category ? `— ${product.category}` : ''}
                    </p>
                    <p className="text-price mt-1.5 text-[15px]">
                      {product.retailPrice !== null ? formatINR(product.retailPrice) : 'No price set'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                    aria-label="Delete product"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger transition active:scale-[0.98] active:bg-danger/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProductForm
          product={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast(editing === 'new' ? 'Product added.' : 'Product updated.', 'success');
            load();
          }}
        />
      )}
    </div>
  );
}
