'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/api-client';

const REJECTABLE_FIELDS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'photo', label: 'Profile photo' },
  { key: 'services', label: 'Services & pricing' },
  { key: 'area', label: 'Working area' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN' },
  { key: 'bank', label: 'Bank account' },
  { key: 'police', label: 'Police verification' },
] as const;

/**
 * Approve / Reject action panel — client component because both flows
 * need state (note, reason, fields[]) + optimistic feedback.
 *
 * Approve: optional note, single-click confirm.
 * Reject: required reason (10+ chars) + checkbox list of fields[] the
 *         pro needs to fix. Pro app's "Rejected" welcome screen will
 *         surface these specific fields.
 */
export function ApprovalActions({
  professionalId,
  currentStatus,
}: {
  professionalId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Only submitted_for_review can be acted on
  if (currentStatus !== 'submitted_for_review') {
    return (
      <div className="card p-6 text-center text-ink-muted">
        <p className="text-body">
          This pro is <strong className="text-ink">{currentStatus.replace(/_/g, ' ')}</strong>.
        </p>
        <p className="mt-1 text-small">
          Only pros in <em>Pending review</em> can be approved or rejected here.
        </p>
      </div>
    );
  }

  const handleApprove = async () => {
    setError(null);
    setMode('approving');
    try {
      await clientFetch(`/api/admin/approvals/${professionalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      startTransition(() => {
        router.refresh();
        router.push('/approvals?status=approved' as never);
      });
    } catch (e: unknown) {
      setError((e as Error).message);
      setMode('idle');
    }
  };

  const handleReject = async () => {
    setError(null);
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    if (fields.length === 0) {
      setError('Select at least one field for the pro to fix');
      return;
    }
    setMode('rejecting');
    try {
      await clientFetch(`/api/admin/approvals/${professionalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), fields }),
      });
      startTransition(() => {
        router.refresh();
        router.push('/approvals?status=rejected' as never);
      });
    } catch (e: unknown) {
      setError((e as Error).message);
      setMode('idle');
    }
  };

  return (
    <div className="card space-y-4 p-6">
      <h3 className="text-body-large font-bold text-ink">Decision</h3>

      {/* Approve panel */}
      <div className="rounded-card border border-success/30 bg-success/5 p-4">
        <h4 className="mb-2 text-small font-bold text-success">Approve</h4>
        <p className="mb-3 text-caption text-ink-muted">
          Pro becomes visible to customers. Optional internal note (saved to audit log).
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note (optional)"
          maxLength={500}
          rows={2}
          className="mb-3 w-full rounded-card border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-subtle"
        />
        <button
          type="button"
          onClick={handleApprove}
          disabled={mode !== 'idle' || isPending}
          className="w-full rounded-card bg-success px-4 py-2.5 text-small font-bold text-white disabled:opacity-50"
        >
          {mode === 'approving' ? 'Approving…' : 'Approve & go live'}
        </button>
      </div>

      {/* Reject panel */}
      <div className="rounded-card border border-danger/30 bg-danger/5 p-4">
        <h4 className="mb-2 text-small font-bold text-danger">Reject</h4>
        <p className="mb-3 text-caption text-ink-muted">
          Pro sees this reason + specific fields to fix on their wizard welcome screen.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (10+ chars, shown to pro)"
          maxLength={500}
          rows={3}
          className="mb-3 w-full rounded-card border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-subtle"
        />
        <p className="mb-2 text-caption font-semibold text-ink-muted">
          Which steps to fix? (select at least one)
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {REJECTABLE_FIELDS.map((f) => {
            const checked = fields.includes(f.key);
            return (
              <label
                key={f.key}
                className={
                  'flex cursor-pointer items-center gap-2 rounded-card border px-3 py-2 text-small ' +
                  (checked
                    ? 'border-danger bg-danger/10 text-danger'
                    : 'border-border bg-surface text-ink-muted')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setFields((prev) =>
                      prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key],
                    )
                  }
                  className="accent-danger"
                />
                {f.label}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleReject}
          disabled={mode !== 'idle' || isPending}
          className="w-full rounded-card border border-danger bg-surface px-4 py-2.5 text-small font-bold text-danger disabled:opacity-50"
        >
          {mode === 'rejecting' ? 'Rejecting…' : 'Send back for fixes'}
        </button>
      </div>

      {error ? (
        <p className="rounded-card border border-danger bg-danger/10 px-3 py-2 text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
