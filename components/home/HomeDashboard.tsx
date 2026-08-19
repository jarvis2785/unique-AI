'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, LogOut, PackageX, Receipt } from 'lucide-react';
import { StoreCard } from './StoreCard';
import { BriefCard } from './BriefCard';
import { BriefDetail } from './BriefDetail';
import { HistoryItem } from '@/components/history/HistoryItem';
import { TransactionDetailSheet } from '@/components/history/TransactionDetailSheet';
import { SkeletonCardList, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRealtimeTransactions } from '@/lib/hooks/useRealtimeTransactions';
import { formatFullDate, formatINR } from '@/lib/utils/format';
import type { DashboardData } from '@/lib/data/dashboard';
import type { DailyBrief, Transaction } from '@/lib/types/domain';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return time.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

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
  const time = useClock();

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

  const alertParts: string[] = [];
  if (data && data.alerts.lowStockCount > 0) alertParts.push(`${data.alerts.lowStockCount} low stock`);
  if (data && data.alerts.deadStockCount > 0) alertParts.push(`${data.alerts.deadStockCount} dead stock`);

  return (
    <div>
      <div className="px-5 pb-4 pt-safe-top safe-top">
        <div className="flex items-start justify-between pt-5">
          <div>
            <h1 className="text-page-title">Good morning, {firstName}</h1>
            <p className="text-secondary-body mt-1">
              {formatFullDate()} &middot; {time}
            </p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted transition active:scale-[0.98] active:bg-elevated"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-5 px-5 pb-4">
          <div className="space-y-2.5">
            <Skeleton className="h-[68px] w-full rounded-2xl" />
            <Skeleton className="h-[68px] w-full rounded-2xl" />
            <Skeleton className="h-[68px] w-full rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <SkeletonCardList count={3} />
        </div>
      )}

      {!loading && dashboardError && (
        <EmptyState icon={AlertTriangle} title="Couldn't load the dashboard" description={dashboardError} />
      )}

      {!loading && data && (
        <div className="space-y-5 px-5 pb-4">
          <div className="space-y-2.5">
            {data.stores.map((store) => (
              <StoreCard key={store.storeId} store={store} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card-surface rounded-2xl px-4 py-4">
              <p className="text-section-header">Today&apos;s Revenue</p>
              <p className="text-price mt-2 text-[26px]">{formatINR(data.today.totalSalesInr)}</p>
            </div>
            <div className="card-surface rounded-2xl px-4 py-4">
              <p className="text-section-header">Units Sold</p>
              <p className="text-price mt-2 text-[26px]">{data.today.totalUnits}</p>
            </div>
          </div>

          {alertParts.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                {data.alerts.lowStockCount > 0 ? <AlertTriangle className="h-5 w-5" /> : <PackageX className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-white">{alertParts.join(' · ')}</p>
                <p className="text-secondary-body">Check stock before you run out</p>
              </div>
            </div>
          )}

          {brief !== undefined && (
            <BriefCard
              brief={brief}
              generating={generating}
              onOpen={() => setBriefOpen(true)}
              onGenerate={handleGenerateBrief}
            />
          )}

          <div>
            <p className="text-section-header mb-2.5">Recent Transactions</p>
            {data.recentTransactions.length === 0 ? (
              <EmptyState icon={Receipt} title="No transactions yet" />
            ) : (
              <div className="space-y-2.5">
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
