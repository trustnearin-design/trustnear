/**
 * Streaming shell — Next.js shows this instantly on a route transition
 * while RSCs fetch in the background. Brand-aware: plum pulse + warm
 * copy so the wait feels like part of the product, not a generic
 * spinner.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-ink-subtle">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-60" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-brand" />
      </div>
      <p className="text-small font-semibold text-ink-muted">Loading…</p>
    </div>
  );
}
