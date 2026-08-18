'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StaffPicker } from './StaffPicker';
import { PinPad } from './PinPad';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { RosterEntry } from '@/lib/data/staff';

export function LoginForm() {
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/auth/roster')
      .then((res) => res.json())
      .then((data) => setRoster(data.roster ?? []))
      .catch(() => setRoster([]));
  }, []);

  async function handleSubmitPin(pin: string) {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selected.id, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Incorrect PIN.');

      const next = searchParams.get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect PIN.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <span className="text-2xl font-bold text-primary">U</span>
        </div>
        <h1 className="text-2xl font-bold text-text">Unique AI</h1>
        <p className="mt-1 text-sm text-text-muted">House of Gadgets & Electronics</p>
      </div>

      {roster === null && <LoadingSpinner label="Loading…" />}

      {roster !== null && roster.length === 0 && (
        <p className="max-w-xs text-center text-sm text-text-muted">
          No staff accounts yet. Ask the owner to set one up.
        </p>
      )}

      {roster !== null && roster.length > 0 && !selected && (
        <>
          <p className="mb-4 text-sm text-text-muted">Who&apos;s this?</p>
          <StaffPicker roster={roster} onSelect={setSelected} />
        </>
      )}

      {selected && (
        <PinPad
          name={selected.fullName}
          onBack={() => {
            setSelected(null);
            setError(null);
          }}
          onSubmit={handleSubmitPin}
          error={error}
          submitting={submitting}
        />
      )}
    </div>
  );
}
