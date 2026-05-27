'use client';

import { useEffect } from 'react';

export default function DashError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('admin error:', error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="text-caption font-semibold uppercase tracking-wider text-danger">Error</p>
      <h2 className="mt-2 text-h2 font-bold text-ink">Something went wrong</h2>
      <p className="mt-2 text-body text-ink-muted">{error.message}</p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
