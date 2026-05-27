'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Ban, AlertTriangle, RefreshCcw, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { formatPaise } from '@/lib/format';

type Mode = 'idle' | 'cancel' | 'dispute' | 'refund' | 'resolve';

export function BookingActions({
  bookingId,
  status,
  paymentStatus,
  totalAmount,
  terminal,
}: {
  bookingId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  terminal: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(String(totalAmount));
  const [resolution, setResolution] = useState<
    'in_favor_of_customer' | 'in_favor_of_pro' | 'split'
  >('in_favor_of_customer');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refundable = paymentStatus === 'paid' || paymentStatus === 'partial_refund';
  const disputed = status === 'disputed';

  function reset() {
    setMode('idle');
    setReason('');
    setRefundAmount(String(totalAmount));
    setResolution('in_favor_of_customer');
    setError(null);
  }

  function submitText() {
    if (mode === 'cancel') return 'Force cancel';
    if (mode === 'dispute') return 'Mark disputed';
    if (mode === 'refund') return `Refund ${formatPaise(Number(refundAmount || 0))}`;
    if (mode === 'resolve') return 'Resolve dispute';
    return '';
  }

  function submit() {
    if (reason.trim().length < 3) {
      setError('Reason / notes must be at least 3 characters.');
      return;
    }

    let url = '';
    let body: Record<string, unknown> = {};

    if (mode === 'cancel') {
      url = `/api/admin/bookings/${bookingId}/cancel`;
      body = { reason: reason.trim() };
    } else if (mode === 'dispute') {
      url = `/api/admin/bookings/${bookingId}/dispute`;
      body = { reason: reason.trim() };
    } else if (mode === 'refund') {
      const amt = Number(refundAmount);
      if (!Number.isFinite(amt) || amt <= 0 || amt > totalAmount) {
        setError(`Refund must be 1..${totalAmount} paise`);
        return;
      }
      url = `/api/admin/bookings/${bookingId}/refund`;
      body = { amountPaise: amt, reason: reason.trim() };
    } else if (mode === 'resolve') {
      url = `/api/admin/bookings/${bookingId}/resolve-dispute`;
      body = { resolution, notes: reason.trim() };
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data?.success) {
        const msg = data?.error?.message ?? 'Failed.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const verbMap: Record<Mode, string> = {
        idle: '',
        cancel: 'Booking cancelled',
        dispute: 'Booking marked disputed',
        refund: `Refunded ${formatPaise(Number(refundAmount))} to customer wallet`,
        resolve: 'Dispute resolved',
      };
      toast.success(verbMap[mode]);
      reset();
      router.refresh();
    });
  }

  if (mode !== 'idle') {
    return (
      <div className="space-y-3 rounded-card border border-border bg-surface-muted/40 p-4">
        <p className="text-small font-semibold text-ink">
          {mode === 'cancel' && 'Force cancel — reason'}
          {mode === 'dispute' && 'Mark disputed — reason'}
          {mode === 'refund' && 'Refund — amount + reason'}
          {mode === 'resolve' && 'Resolve dispute — pick an outcome'}
        </p>

        {mode === 'refund' && (
          <div>
            <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Refund amount (paise) — booking total {formatPaise(totalAmount)}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min={1}
                max={totalAmount}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setRefundAmount(String(totalAmount))}
                className="rounded-card border border-border bg-surface px-3 text-small text-ink hover:bg-surface-muted"
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setRefundAmount(String(Math.floor(totalAmount / 2)))}
                className="rounded-card border border-border bg-surface px-3 text-small text-ink hover:bg-surface-muted"
              >
                50%
              </button>
            </div>
          </div>
        )}

        {mode === 'resolve' && (
          <div className="space-y-2">
            <RadioRow
              checked={resolution === 'in_favor_of_customer'}
              onChange={() => setResolution('in_favor_of_customer')}
              label="In favour of customer"
              description="Cancel booking + refund full amount to customer wallet."
            />
            <RadioRow
              checked={resolution === 'in_favor_of_pro'}
              onChange={() => setResolution('in_favor_of_pro')}
              label="In favour of expert"
              description="Close as completed. Pro keeps payout. No refund."
            />
            <RadioRow
              checked={resolution === 'split'}
              onChange={() => setResolution('split')}
              label="Split / partial refund"
              description="Close as completed. Follow up with a partial Refund action separately."
            />
          </div>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="input"
          placeholder={
            mode === 'resolve'
              ? 'Notes shown on the booking + audit log.'
              : "What's the reason? Logged + shown on the booking record."
          }
          autoFocus
        />
        {error && <p className="text-small text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={submit} disabled={pending} className="btn-primary">
            {pending ? 'Working…' : submitText()}
          </button>
          <button type="button" onClick={reset} className="btn-ghost">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {disputed && (
        <button
          type="button"
          onClick={() => setMode('resolve')}
          className="inline-flex items-center gap-1.5 rounded-pill border border-success/40 bg-success/5 px-4 py-2 text-small font-semibold text-success transition hover:bg-success/10"
        >
          <Scale className="h-3.5 w-3.5" />
          Resolve dispute
        </button>
      )}
      {refundable && (
        <button
          type="button"
          onClick={() => setMode('refund')}
          className="inline-flex items-center gap-1.5 rounded-pill border border-brand/30 bg-brand/5 px-4 py-2 text-small font-semibold text-brand transition hover:bg-brand/10"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refund
        </button>
      )}
      <button
        type="button"
        onClick={() => setMode('cancel')}
        disabled={terminal}
        className="inline-flex items-center gap-1.5 rounded-pill border border-danger/30 px-4 py-2 text-small font-semibold text-danger transition hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-50"
        title={terminal ? `Cannot cancel a ${status} booking` : 'Force cancel'}
      >
        <Ban className="h-3.5 w-3.5" />
        Force cancel
      </button>
      <button
        type="button"
        onClick={() => setMode('dispute')}
        disabled={disputed}
        className="inline-flex items-center gap-1.5 rounded-pill border border-warning/40 px-4 py-2 text-small font-semibold text-warning transition hover:bg-warning/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Mark disputed
      </button>
    </div>
  );
}

function RadioRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={
        'flex cursor-pointer items-start gap-3 rounded-card border p-3 transition ' +
        (checked ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:bg-surface-muted')
      }
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-brand" />
      <div>
        <p className="text-small font-semibold text-ink">{label}</p>
        <p className="text-caption text-ink-muted">{description}</p>
      </div>
    </label>
  );
}
