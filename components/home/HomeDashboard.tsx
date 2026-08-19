'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, LogOut, Receipt } from 'lucide-react';
import { StoreCard } from './StoreCard';
import { BriefCard } from './BriefCard';
import { BriefDetail } from './BriefDetail';
import { HistoryItem } from '@/components/history/HistoryItem';
import { TransactionDetailSheet } from '@/components/history/TransactionDetailSheet';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRealtimeTransactions } from '@/lib/hooks/useRealtimeTransactions';
import { formatFullDate, formatINR } from '@/lib/utils/format';
import type { DashboardData } from '@/lib/data/dashboard';
import type { DailyBrief, Transaction } from '@/lib/types/domain';

export function HomeDashboard({ fullName }: { fullName: string }) {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null | undefined>(undefined);
  const [briefOpen, setBriefOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const loadDashboard = useCallback(() => {
    fetch('/api/dashboard')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Could not load the dashboard.');
        setData(body);
        setDashboardError(null);
      })
      .catch((err) => setDashboardError(err.message ?? 'Could not load the dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const loadBrief = useCallback(() => {
    fetch('/api/brief/today')
      .then(async (res) => (res.ok ? (await res.json()).brief : null))
      .then((brief) => setBrief(brief))
      .catch(() => setBrief(null));
  }, []);

  useEffect(() => {
    loadDashboard();
    loadBrief();
  }, [loadDashboard, loadBrief]);

  useRealtimeTransactions(loadDashboard);

  async function handleGenerateBrief() {
    setGenerating(true);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Could not generate the brief.');
      setBrief(d.brief);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not generate the brief.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  const firstName = fullName.split(' ')[0];

  return (
    <div>
      <div className="px-4 pb-3 pt-safe-top safe-top">
        <div className="flex items-start justify-between pt-4">
          <div>
            <h1 className="text-xl font-bold text-text">Good morning, {firstName}</h1>
            <p className="text-sm text-text-muted">{formatFullDate()}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted active:bg-elevated"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading dashboard…" />}

      {!loading && dashboardError && (
        <EmptyState icon={AlertTriangle} title="Couldn't load the dashboard" description={dashboardError} />
      )}

      {!loading && data && (
        <div className="space-y-5 px-4 pb-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {data.stores.map((store) => (
              <StoreCard key={store.storeId} store={store} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-elevated bg-surface px-4 py-3.5">
              <p className="text-xs text-text-muted">Today</p>
              <p className="mt-1 font-mono text-lg font-bold text-text">{formatINR(data.today.totalSalesInr)}</p>
              <p className="text-xs text-text-muted">{data.today.totalUnits} units sold</p>
            </div>
            <div className="rounded-xl border border-elevated bg-surface px-4 py-3.5">
              <p className="text-xs text-text-muted">Alerts</p>
              <p className="mt-1 font-mono text-lg font-bold text-warning">{data.alerts.lowStockCount} low stock</p>
              <p className="text-xs text-text-muted">{data.alerts.deadStockCount} dead stock items</p>
            </div>
          </div>

          {brief !== undefined && (
            <BriefCard
              brief={brief}
              generating={generating}
              onOpen={() => setBriefOpen(true)}
              onGenerate={handleGenerateBrief}
            />
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-text">Recent Transactions</p>
            {data.recentTransactions.length === 0 ? (
              <EmptyState icon={Receipt} title="No transactions yet" />
            ) : (
              <div className="space-y-2">
                {data.recentTransactions.map((t) => (
                  <HistoryItem key={t.id} transaction={t} viewerRole="owner" onOpen={setSelectedTransaction} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {briefOpen && brief && <BriefDetail brief={brief} onClose={() => setBriefOpen(false)} />}
      {selectedTransaction && (
        <TransactionDetailSheet transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
      )}
    </div>
  );
}
