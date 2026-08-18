'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { StaffForm } from '@/components/manage/StaffForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
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
      <div className="sticky top-0 z-20 border-b border-elevated bg-background/95 px-4 pb-3 pt-safe-top backdrop-blur safe-top">
        <div className="flex items-center gap-3 pt-3">
          <Link href="/manage" className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted active:bg-elevated">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-text">Staff Accounts</h1>
          <button
            onClick={() => setFormOpen(true)}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading && <LoadingSpinner label="Loading staff…" />}

        {!loading && staff.length === 0 && <EmptyState icon={Users} title="No staff accounts yet" />}

        {!loading && staff.length > 0 && (
          <div className="space-y-2">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-elevated bg-surface px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{member.fullName}</p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    <span className="capitalize">{member.role}</span>
                    {member.storeName ? ` — ${member.storeName}` : ''}
                  </p>
                </div>
                {member.role === 'owner' ? (
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">Owner</span>
                ) : (
                  <button
                    onClick={() => toggleActive(member)}
                    disabled={togglingId === member.id}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
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
