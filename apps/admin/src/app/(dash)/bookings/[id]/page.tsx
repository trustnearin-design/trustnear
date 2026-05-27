import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { BookingActions } from './BookingActions';

type BookingDetail = {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  basePrice: number;
  platformFee: number;
  promoDiscount: number;
  commission: number;
  proPayout: number;
  paymentMethod: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  durationMinutes: number;
  notes: string | null;
  cancellationReason: string | null;
  isRepeatBooking: boolean;
  addressLine: string;
  addressArea: string | null;
  addressCity: string;
  addressLat: string | number;
  addressLng: string | number;
  category: { name: string; slug: string };
  customer: { id: string; fullName: string | null; phone: string };
  professional: { id: string; user: { fullName: string | null; phone: string } } | null;
};

const TERMINAL = ['completed', 'cancelled_customer', 'cancelled_pro'];

export const dynamic = 'force-dynamic';

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await apiFetch<BookingDetail>(`/api/v1/admin/bookings/${id}`);

  return (
    <>
      <Link href="/bookings" className="btn-ghost mb-3 -ml-2">
        ← Back to bookings
      </Link>
      <PageHeader
        title={b.bookingNumber}
        subtitle={`${b.category.name} · ${formatRelativeDate(b.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: parties + status */}
        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Status</h2>
            <p className="mt-2 text-h2 font-bold text-brand">{b.status.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-small text-ink-muted">
              Payment: {b.paymentStatus}
              {b.paymentMethod && ` · ${b.paymentMethod}`}
            </p>
            {b.cancellationReason && (
              <div className="mt-3 rounded-card border border-danger/30 bg-danger/5 p-3 text-small text-danger">
                {b.cancellationReason}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Customer</h2>
            <Link
              href={`/users/${b.customer.id}` as never}
              className="mt-2 block text-body font-semibold text-brand hover:underline"
            >
              {b.customer.fullName ?? 'Unnamed'}
            </Link>
            <p className="text-small text-ink-muted">{b.customer.phone}</p>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Expert</h2>
            {b.professional ? (
              <>
                <Link
                  href={`/experts/${b.professional.id}` as never}
                  className="mt-2 block text-body font-semibold text-brand hover:underline"
                >
                  {b.professional.user.fullName ?? 'Unnamed'}
                </Link>
                <p className="text-small text-ink-muted">{b.professional.user.phone}</p>
              </>
            ) : (
              <p className="mt-2 text-small text-ink-subtle">Not assigned yet.</p>
            )}
          </section>
        </aside>

        {/* Right */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Pricing</h2>
            <dl className="mt-3 space-y-2 text-small">
              <Row label="Base price" value={formatPaise(b.basePrice)} />
              <Row label="Platform fee" value={formatPaise(b.platformFee)} />
              {b.promoDiscount > 0 && (
                <Row label="Promo discount" value={`− ${formatPaise(b.promoDiscount)}`} />
              )}
              <Row label="Commission (platform)" value={formatPaise(b.commission)} />
              <Row label="Pro payout" value={formatPaise(b.proPayout)} />
              <div className="border-t border-border pt-2">
                <Row
                  label={<strong>Total</strong>}
                  value={<strong>{formatPaise(b.totalAmount)}</strong>}
                />
              </div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Timeline</h2>
            <dl className="mt-3 space-y-2 text-small">
              <Row label="Created" value={new Date(b.createdAt).toLocaleString('en-IN')} />
              <Row label="Scheduled for" value={new Date(b.scheduledAt).toLocaleString('en-IN')} />
              {b.startedAt && (
                <Row label="Started" value={new Date(b.startedAt).toLocaleString('en-IN')} />
              )}
              {b.completedAt && (
                <Row label="Completed" value={new Date(b.completedAt).toLocaleString('en-IN')} />
              )}
              <Row label="Duration" value={`${b.durationMinutes} min`} />
              {b.isRepeatBooking && <Row label="Repeat booking" value="Yes" />}
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Address</h2>
            <p className="mt-2 text-body text-ink">
              {b.addressLine}
              {b.addressArea && `, ${b.addressArea}`}, {b.addressCity}
            </p>
            <p className="text-caption text-ink-subtle">
              {Number(b.addressLat).toFixed(5)}, {Number(b.addressLng).toFixed(5)}
            </p>
          </section>

          {b.notes && (
            <section className="card p-6">
              <h2 className="text-h3 font-semibold text-ink">Customer notes</h2>
              <p className="mt-2 text-body text-ink-muted">{b.notes}</p>
            </section>
          )}

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Admin actions</h2>
            <p className="mt-1 text-small text-ink-muted">
              Every action is recorded in the audit log.
            </p>
            <div className="mt-4">
              <BookingActions
                bookingId={b.id}
                status={b.status}
                paymentStatus={b.paymentStatus}
                totalAmount={b.totalAmount}
                terminal={TERMINAL.includes(b.status)}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
