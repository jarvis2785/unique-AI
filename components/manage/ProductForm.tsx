'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { ProductManageRow } from '@/lib/data/products';

export interface ProductFormValues {
  skuCode: string;
  name: string;
  brand: string;
  category: string;
  variant: string;
  barcode: string;
  retailPrice: string;
  wholesalePrice: string;
  lowStockThreshold: string;
}

function toFormValues(product?: ProductManageRow, prefillBarcode?: string): ProductFormValues {
  return {
    skuCode: product?.skuCode ?? '',
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    category: product?.category ?? '',
    variant: product?.variant ?? '',
    barcode: product?.barcode ?? prefillBarcode ?? '',
    retailPrice: product?.retailPrice?.toString() ?? '',
    wholesalePrice: product?.wholesalePrice?.toString() ?? '',
    lowStockThreshold: product?.lowStockThreshold?.toString() ?? '5',
  };
}

interface ProductFormProps {
  product?: ProductManageRow;
  prefillBarcode?: string;
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_CLASS =
  'h-tap w-full rounded-xl border border-elevated bg-background px-3.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none';

export function ProductForm({ product, prefillBarcode, onClose, onSaved }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(toFormValues(product, prefillBarcode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit() {
    if (!values.skuCode.trim() || !values.name.trim()) {
      setError('SKU and name are required.');
      return;
    }
    const retailPrice = Number(values.retailPrice);
    const wholesalePrice = Number(values.wholesalePrice || values.retailPrice);
    if (!Number.isFinite(retailPrice) || retailPrice < 0) {
      setError('Enter a valid retail price.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      skuCode: values.skuCode.trim(),
      name: values.name.trim(),
      brand: values.brand.trim() || null,
      category: values.category.trim() || null,
      variant: values.variant.trim() || null,
      barcode: values.barcode.trim() || null,
      retailPrice,
      wholesalePrice,
      lowStockThreshold: Number(values.lowStockThreshold) || 5,
    };

    try {
      const res = await fetch(product ? `/api/products/${product.id}` : '/api/products', {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save the product.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={submitting ? undefined : onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-safe-bottom sm:rounded-3xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} disabled={submitting} className="flex h-tap w-tap items-center justify-center rounded-full text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">SKU *</label>
              <input value={values.skuCode} onChange={(e) => set('skuCode', e.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Barcode</label>
              <input value={values.barcode} onChange={(e) => set('barcode', e.target.value)} className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Name *</label>
            <input value={values.name} onChange={(e) => set('name', e.target.value)} className={FIELD_CLASS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Brand</label>
              <input value={values.brand} onChange={(e) => set('brand', e.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Category</label>
              <input value={values.category} onChange={(e) => set('category', e.target.value)} className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Variant</label>
            <input value={values.variant} onChange={(e) => set('variant', e.target.value)} className={FIELD_CLASS} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Retail ₹ *</label>
              <input
                inputMode="decimal"
                value={values.retailPrice}
                onChange={(e) => set('retailPrice', e.target.value)}
                className={`${FIELD_CLASS} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Wholesale ₹</label>
              <input
                inputMode="decimal"
                value={values.wholesalePrice}
                onChange={(e) => set('wholesalePrice', e.target.value)}
                className={`${FIELD_CLASS} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Low stock at</label>
              <input
                inputMode="numeric"
                value={values.lowStockThreshold}
                onChange={(e) => set('lowStockThreshold', e.target.value)}
                className={`${FIELD_CLASS} font-mono`}
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 flex h-tap w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </div>
  );
}
