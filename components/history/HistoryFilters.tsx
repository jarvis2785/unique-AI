'use client';

import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { SearchResultProduct, Store } from '@/lib/types/domain';

export interface HistoryFilterState {
  storeId: string;
  staffId: string;
  productId: string;
  productName: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: HistoryFilterState = {
  storeId: '',
  staffId: '',
  productId: '',
  productName: '',
  dateFrom: '',
  dateTo: '',
};

interface StaffOption {
  id: string;
  fullName: string;
}

export function HistoryFilters({
  filters,
  onChange,
}: {
  filters: HistoryFilterState;
  onChange: (filters: HistoryFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [productQuery, setProductQuery] = useState(filters.productName);
  const [productOptions, setProductOptions] = useState<SearchResultProduct[]>([]);
  const debouncedProductQuery = useDebounce(productQuery, 400);

  useEffect(() => {
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => setStores(data.stores ?? []))
      .catch(() => {});
    fetch('/api/staff')
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trimmed = debouncedProductQuery.trim();
    if (!trimmed || trimmed === filters.productName) {
      setProductOptions([]);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&fast=1`)
      .then((res) => res.json())
      .then((data) => setProductOptions(data.results ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProductQuery]);

  const activeCount = [filters.storeId, filters.staffId, filters.productId, filters.dateFrom, filters.dateTo].filter(
    Boolean
  ).length;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-3.5 text-sm text-text-muted transition active:scale-[0.98]"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Store</label>
            <select
              value={filters.storeId}
              onChange={(e) => onChange({ ...filters, storeId: e.target.value })}
              className="h-11 w-full rounded-lg border border-white/10 bg-background px-3 text-sm text-text"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Staff</label>
            <select
              value={filters.staffId}
              onChange={(e) => onChange({ ...filters, staffId: e.target.value })}
              className="h-11 w-full rounded-lg border border-white/10 bg-background px-3 text-sm text-text"
            >
              <option value="">All staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Product</label>
            {filters.productId ? (
              <div className="flex h-11 items-center justify-between rounded-lg border border-white/10 bg-background px-3 text-sm text-text">
                {filters.productName}
                <button
                  onClick={() => {
                    onChange({ ...filters, productId: '', productName: '' });
                    setProductQuery('');
                  }}
                >
                  <X className="h-4 w-4 text-text-muted" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search product…"
                  className="h-11 w-full rounded-lg border border-white/10 bg-background px-3 text-sm text-text placeholder:text-text-muted"
                />
                {productOptions.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-surface shadow-lg">
                    {productOptions.map((p) => (
                      <button
                        key={p.productId}
                        onClick={() => {
                          onChange({ ...filters, productId: p.productId, productName: p.name });
                          setProductOptions([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-elevated"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="h-11 w-full rounded-lg border border-white/10 bg-background px-2 text-sm text-text"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="h-11 w-full rounded-lg border border-white/10 bg-background px-2 text-sm text-text"
              />
            </div>
          </div>

          {activeCount > 0 && (
            <button
              onClick={() => {
                onChange(EMPTY_FILTERS);
                setProductQuery('');
              }}
              className="w-full text-center text-sm text-primary"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
