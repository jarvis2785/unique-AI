'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Delete, Loader2 } from 'lucide-react';

const MIN_LENGTH = 4;
const MAX_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

interface PinPadProps {
  name: string;
  onBack: () => void;
  onSubmit: (pin: string) => Promise<void>;
  error: string | null;
  submitting: boolean;
}

export function PinPad({ name, onBack, onSubmit, error, submitting }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      setPin('');
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function press(key: string) {
    if (submitting) return;
    if (key === 'backspace') {
      setPin((p) => p.slice(0, -1));
    } else if (key && pin.length < MAX_LENGTH) {
      setPin((p) => p + key);
    }
  }

  function confirm() {
    if (pin.length < MIN_LENGTH || submitting) return;
    onSubmit(pin);
  }

  const canConfirm = pin.length >= MIN_LENGTH && pin.length <= MAX_LENGTH;

  return (
    <div className="flex flex-col items-center px-6">
      <button
        onClick={onBack}
        disabled={submitting}
        className="mb-6 flex items-center gap-1.5 self-start text-sm text-text-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Not {name}?
      </button>

      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
        {name.charAt(0).toUpperCase()}
      </div>
      <h1 className="text-xl font-bold text-text">{name}</h1>
      <p className="mt-1 text-sm text-text-muted">Enter your PIN</p>

      <div className={`my-6 flex gap-3 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: MAX_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
              i < pin.length ? 'border-primary bg-primary' : 'border-elevated bg-transparent'
            } ${i >= MIN_LENGTH ? 'opacity-70' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              disabled={submitting}
              aria-label={key === 'backspace' ? 'Delete' : key}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-xl font-semibold text-text transition active:scale-95 active:bg-elevated disabled:opacity-50"
            >
              {key === 'backspace' ? <Delete className="h-5 w-5" /> : key}
            </button>
          )
        )}
      </div>

      <button
        onClick={confirm}
        disabled={!canConfirm || submitting}
        className="mt-6 flex h-tap w-full max-w-[13.5rem] items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        Confirm
      </button>
    </div>
  );
}
