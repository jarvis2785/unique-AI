'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Store, UserRole } from '@/lib/types/domain';

interface StaffFormProps {
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_CLASS =
  'h-tap w-full rounded-xl border border-white/10 bg-background px-3.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none';

export function StaffForm({ onClose, onSaved }: StaffFormProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [storeId, setStoreId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        setStores(data.stores ?? []);
        if (data.stores?.[0]) setStoreId(data.stores[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!fullName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    if (role !== 'owner' && !storeId) {
      setError('Select an assigned store.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          pin,
          role,
          storeId: role === 'owner' ? null : storeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create the account.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={submitting ? undefined : onClose} />

      <div className="card-surface relative z-10 w-full max-w-sm rounded-t-[24px] p-5 pb-safe-bottom sm:rounded-[24px] animate-slide-up-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-product-name text-[18px]">Add Staff Account</h2>
          <button onClick={onClose} disabled={submitting} className="flex h-tap w-tap items-center justify-center rounded-full text-text-muted transition active:scale-[0.98]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">PIN (4-6 digits)</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className={`${FIELD_CLASS} font-mono tracking-widest`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={FIELD_CLASS}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Store</label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                disabled={role === 'owner'}
                className={`${FIELD_CLASS} disabled:opacity-50`}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-gradient mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
