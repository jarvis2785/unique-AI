'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { HistoryItem } from '@/components/history/HistoryItem';
import { TransactionDetailSheet } from '@/components/history/TransactionDetailSheet';
import { HistoryFilters, EMPTY_FILTERS, type HistoryFilterState } from '@/components/history/HistoryFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Transaction } from '@/lib/types/domain';

export default function HistoryPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<HistoryFilterState>(EMPTY_FILTERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.storeId) params.set('storeId', filters.storeId);
    if (filters.staffId) params.set('staffId', filters.staffId);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.dateFrom) params.set('dateFrom', new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      params.set('dateTo', end.toISOString());
    }

    fetch(`/api/transactions?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to load history');
        return res.json();
      })
      .then((data) => setTransactions(data.transactions ?? []))
      .catch((err) => setError(err.message ?? 'Could not load history.'))
      .finally(() => setLoading(false));
  }, [user, filters]);

  if (!user) return <LoadingSpinner label="Loading…" />;

  return (
    <div>
      <Header title="History" subtitle={user.role === 'staff' ? 'Your transactions' : 'All stores'} />

      <div className="px-5 py-4">
        {user.role !== 'staff' && <HistoryFilters filters={filters} onChange={setFilters} />}

        {loading && <SkeletonCardList count={6} />}

        {error && !loading && (
          <EmptyState icon={Receipt} title="Couldn't load history" description={error} />
        )}

        {!loading && !error && transactions.length === 0 && (
          <EmptyState icon={Receipt} title="No transactions yet" description="Sales will show up here as they happen." />
        )}

        {!loading && !error && transactions.length > 0 && (
          <div className="space-y-2.5">
            {transactions.map((t) => (
              <HistoryItem key={t.id} transaction={t} viewerRole={user.role} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && <TransactionDetailSheet transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
