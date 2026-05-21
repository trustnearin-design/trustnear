import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

/**
 * Backend shape for POST /payments/order — see apps/api/src/features/payments/service.ts.
 * `paymentSessionId` is what the Cashfree SDK consumes.
 */
export interface CreatePaymentOrderResult {
  bookingId: string;
  paymentSessionId: string;
  providerOrderId: string;
  amountPaise: number;
  provider: 'cashfree' | 'razorpay' | string;
  status: string;
}

export interface VerifyPaymentResult {
  bookingId: string;
  status: string;
  alreadyProcessed: boolean;
}

/**
 * Create a payment order on the server. Returns the session ID the
 * Cashfree SDK needs to open checkout. We send an idempotency key so a
 * double-tap on Pay doesn't create duplicate provider orders.
 */
export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: ({ bookingId, customerEmail }: { bookingId: string; customerEmail?: string }) =>
      apiFetch<CreatePaymentOrderResult>('/payments/order', {
        method: 'POST',
        body: { bookingId, ...(customerEmail ? { customerEmail } : {}) },
        headers: {
          // Backend's idempotency middleware coalesces retries within a
          // short window — safe to reuse the bookingId since one customer
          // pays one booking at a time.
          'X-Idempotency-Key': `pay-order-${bookingId}`,
        },
      }),
  });
}

/**
 * Defensive post-checkout confirmation. The webhook is authoritative, but
 * the customer's app calling /verify means we can flip the UI to "paid"
 * without waiting for our 5-second booking poll to pick up the change.
 */
export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiFetch<VerifyPaymentResult>('/payments/verify', {
        method: 'POST',
        body: { bookingId },
      }),
    onSuccess: (_, bookingId) => {
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['bookings.mine'] });
    },
  });
}
