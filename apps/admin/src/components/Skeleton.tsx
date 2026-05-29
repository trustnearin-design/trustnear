/**
 * Plum-tinted skeleton primitive — gives loading lists/tables a
 * brand-aware shimmer instead of generic gray. Use with width/height
 * via className (e.g. `<Skeleton className="h-4 w-32" />`).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={'inline-block animate-pulse rounded-md bg-brand-100/70 ' + className}
    />
  );
}

/**
 * Pre-laid-out skeleton row for a typical data table — avatar + two
 * text lines + a status pill. Repeat <SkeletonRow /> N times inside
 * a card to fake a list while data loads.
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-pill" />
    </div>
  );
}
