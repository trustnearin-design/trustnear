'use client';

import { Mascot } from './Mascot';

/**
 * Error-state block — small Sevak + warm copy + optional retry.
 * Used inside catch boundaries or as fallback when a fetch fails.
 *
 *   <ErrorState
 *     title="Kuch galat ho gaya"
 *     subtitle={error.message}
 *     onRetry={() => refetch()}
 *   />
 */
export function ErrorState({
  title = 'Kuch galat ho gaya',
  subtitle,
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <Mascot variant="confident" size={104} />
      <h3 className="mt-2 font-display text-h3 font-bold text-ink">{title}</h3>
      {subtitle && <p className="max-w-md text-small text-ink-muted">{subtitle}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary text-small">
          Retry
        </button>
      )}
    </div>
  );
}
