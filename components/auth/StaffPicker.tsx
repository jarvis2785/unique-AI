'use client';

import { ChevronRight } from 'lucide-react';
import type { RosterEntry } from '@/lib/data/staff';

interface StaffPickerProps {
  roster: RosterEntry[];
  onSelect: (entry: RosterEntry) => void;
}

export function StaffPicker({ roster, onSelect }: StaffPickerProps) {
  return (
    <div className="w-full max-w-sm space-y-2">
      {roster.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry)}
          className="flex h-tap w-full items-center gap-3 rounded-xl border border-elevated bg-surface px-4 text-left transition active:scale-[0.99] active:bg-elevated"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {entry.fullName.charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 font-medium text-text">{entry.fullName}</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
        </button>
      ))}
    </div>
  );
}
