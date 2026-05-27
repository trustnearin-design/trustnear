/**
 * Shared loading skeletons. Match the shape of the real content so the
 * page doesn't visually jump when data lands.
 */

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-muted ${className}`} />;
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <SkeletonBar className="mb-3 h-3 w-20" />
          <SkeletonBar className="mb-2 h-8 w-32" />
          <SkeletonBar className="h-3 w-24" />
        </div>
      ))}
    </section>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4">
            <SkeletonBar className="h-11 w-11 rounded-full" />
            <div className="flex-1">
              <SkeletonBar className="mb-2 h-4 w-40" />
              <SkeletonBar className="h-3 w-64" />
            </div>
            <SkeletonBar className="hidden h-3 w-20 md:block" />
            <SkeletonBar className="hidden h-3 w-16 lg:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkeletonFilters() {
  return (
    <div className="card mb-5 grid gap-3 p-4 md:grid-cols-[1fr,200px,200px,auto]">
      <SkeletonBar className="h-10" />
      <SkeletonBar className="h-10" />
      <SkeletonBar className="h-10" />
      <SkeletonBar className="h-10 w-24" />
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="mb-6">
      <SkeletonBar className="mb-2 h-8 w-48" />
      <SkeletonBar className="h-4 w-72" />
    </div>
  );
}
