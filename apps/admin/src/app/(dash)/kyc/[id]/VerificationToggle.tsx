'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function VerificationToggle({
  professionalId,
  field,
  currentValue,
  breakGlass = false,
}: {
  professionalId: string;
  field: 'aadhaar' | 'pan' | 'bank' | 'police' | 'face';
  currentValue: boolean;
  breakGlass?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setValue(value: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/kyc/${professionalId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Failed to update.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      {breakGlass && (
        <p className="text-caption text-warning">
          Manual override — only the police-verification flag is meant to be set here. Use other
          toggles only as a break-glass.
        </p>
      )}
      <div className="flex gap-2">
        {!currentValue && (
          <button
            type="button"
            onClick={() => setValue(true)}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? 'Saving…' : 'Mark verified'}
          </button>
        )}
        {currentValue && (
          <button
            type="button"
            onClick={() => setValue(false)}
            disabled={pending}
            className="btn-ghost border border-danger/30 text-danger hover:bg-danger/5 hover:text-danger"
          >
            {pending ? 'Saving…' : 'Revoke verification'}
          </button>
        )}
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
