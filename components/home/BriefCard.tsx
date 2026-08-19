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
      <div className="card-accent rounded-2xl px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="icon-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-[15px] font-bold text-white">Today&apos;s brief isn&apos;t ready yet</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-gradient mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
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
      className="card-accent flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition active:scale-[0.98]"
    >
      <div className="icon-gradient glow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-badge text-primary">Today&apos;s AI Brief</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-white">&ldquo;{headline}&rdquo;</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <ChevronRight className="h-4.5 w-4.5" />
      </div>
    </button>
  );
}
