export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-ink-subtle">
      <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-brand" />
      <span className="ml-3 text-small">Loading…</span>
    </div>
  );
}
