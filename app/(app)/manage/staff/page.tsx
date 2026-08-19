'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { StaffForm } from '@/components/manage/StaffForm';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { StaffRow } from '@/lib/data/staff';

export default function StaffAccountsPage() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/staff')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to load staff');
        return res.json();
      })
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => showToast('Could not load staff accounts.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(member: StaffRow) {
    setTogglingId(member.id);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not update the account.');
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, isActive: !s.isActive } : s)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update the account.', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-5 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/manage" className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition active:scale-[0.98] active:bg-elevated">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-page-title text-[20px]">Staff Accounts</h1>
          <button
            onClick={() => setFormOpen(true)}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading && <SkeletonCardList count={5} />}

        {!loading && staff.length === 0 && <EmptyState icon={Users} title="No staff accounts yet" />}

        {!loading && staff.length > 0 && (
          <div className="space-y-2.5">
            {staff.map((member) => (
              <div key={member.id} className="card-surface flex items-center gap-3 rounded-2xl px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-product-name break-words">{member.fullName}</p>
                  <p className="text-secondary-body mt-0.5">
                    <span className="capitalize">{member.role}</span>
                    {member.storeName ? ` — ${member.storeName}` : ''}
                  </p>
                </div>
                {member.role === 'owner' ? (
                  <span className="text-badge rounded-full bg-primary/15 px-3 py-1.5 text-primary">Owner</span>
                ) : (
                  <button
                    onClick={() => toggleActive(member)}
                    disabled={togglingId === member.id}
                    className={`text-badge rounded-full px-3 py-1.5 transition active:scale-[0.98] ${
                      member.isActive ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}
                  >
                    {member.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <StaffForm
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            showToast('Staff account created.', 'success');
            load();
          }}
        />
      )}
    </div>
  );
}
