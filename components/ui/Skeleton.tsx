export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card-surface rounded-2xl px-4 py-3.5">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-2 h-3 w-2/5" />
    </div>
  );
}

export function SkeletonCardList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
