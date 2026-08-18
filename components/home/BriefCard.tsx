import { ChevronRight, Loader2, Sparkles } from 'lucide-react';
import type { DailyBrief } from '@/lib/types/domain';

interface BriefCardProps {
  brief: DailyBrief | null;
  generating: boolean;
  onOpen: () => void;
  onGenerate: () => void;
}

export function BriefCard({ brief, generating, onOpen, onGenerate }: BriefCardProps) {
  if (!brief) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-semibold">Today&apos;s brief isn&apos;t ready yet</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Brief'}
        </button>
      </div>
    );
  }

  const urgentCount = brief.content.urgent?.length ?? 0;
  const headline =
    urgentCount > 0
      ? `${urgentCount} urgent item${urgentCount === 1 ? '' : 's'} need attention`
      : brief.content.insight || 'No urgent issues today';

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-4 text-left"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Today&apos;s AI Brief
        </p>
        <p className="mt-1 truncate text-sm font-medium text-text">&ldquo;{headline}&rdquo;</p>
        <p className="mt-1 text-xs text-primary">Tap to read full brief →</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
    </button>
  );
}
