'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Refires `onChange` whenever a transaction is inserted anywhere — keeps Home's dashboard live. */
export function useRealtimeTransactions(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        onChange();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
