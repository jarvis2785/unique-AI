'use client';

import { AlertTriangle, Lightbulb, PackageX, TrendingUp, X } from 'lucide-react';
import { formatDateTime, formatINR } from '@/lib/utils/format';
import type { DailyBrief } from '@/lib/types/domain';

export function BriefDetail({ brief, onClose }: { brief: DailyBrief; onClose: () => void }) {
  const { content } = brief;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />

      <div className="card-surface relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] pb-safe-bottom animate-slide-up-panel">
        <div className="card-surface sticky top-0 flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-section-header">Today&apos;s Brief</p>
            <p className="text-secondary-body mt-0.5">Generated {formatDateTime(brief.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-tap w-tap items-center justify-center rounded-full text-text-muted transition active:scale-[0.98]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {content.urgent?.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-danger">
                <AlertTriangle className="h-4 w-4" /> URGENT
              </h3>
              <div className="space-y-2.5">
                {content.urgent.map((item, i) => (
                  <div key={i} className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-3">
                    <p className="font-semibold text-text">{item.product}</p>
                    <p className="text-sm text-text-muted">
                      {item.issue} — {item.store}
                    </p>
                    <p className="mt-1 text-sm font-medium text-danger">→ {item.action}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {content.dead_stock?.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-warning">
                <PackageX className="h-4 w-4" /> DEAD STOCK
              </h3>
              <div className="space-y-2.5">
                {content.dead_stock.map((item, i) => (
                  <div key={i} className="rounded-lg bg-elevated/50 px-3.5 py-3">
                    <p className="font-semibold text-text">{item.product}</p>
                    <p className="text-sm text-text-muted">
                      {item.quantity} units at {item.store}. Idle {item.days_idle} days.
                    </p>
                    <p className="mt-1 font-mono text-sm text-warning">{formatINR(item.value_blocked)} blocked</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {content.yesterday && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-success">
                <TrendingUp className="h-4 w-4" /> YESTERDAY
              </h3>
              <div className="rounded-lg bg-elevated/50 px-3.5 py-3 text-sm">
                <p className="text-text">
                  Total: <span className="font-mono font-semibold">{formatINR(content.yesterday.total_sales_inr)}</span>{' '}
                  across 3 stores
                </p>
                <p className="mt-1 text-text-muted">
                  Top seller: {content.yesterday.top_seller} — {content.yesterday.top_seller_units} units
                </p>
                {content.yesterday.best_store && (
                  <p className="mt-1 text-text-muted">{content.yesterday.best_store} performed best</p>
                )}
              </div>
            </section>
          )}

          {content.refill?.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold text-primary">🔄 REORDER THIS WEEK</h3>
              <div className="space-y-1.5">
                {content.refill.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-text">{item.product}</span>
                    <span className="font-mono text-text-muted">{item.recommended_order} units</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {content.insight && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
                <Lightbulb className="h-4 w-4" /> INSIGHT
              </h3>
              <p className="rounded-lg bg-primary/10 px-3.5 py-3 text-sm text-text">{content.insight}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
