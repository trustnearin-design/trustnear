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
  /**
   * Gateway environment the session was minted in. The Cashfree SDK MUST be
   * opened in this same environment — driving it off `__DEV__` breaks release
   * APKs, where __DEV__ is false but staging mints sandbox sessions.
   * Optional for back-compat with an API that predates this field.
   */
  environment?: 'sandbox' | 'production';
  status: string;
  /** Wallet balance applied to this booking (paise). */
  walletApplied: number;
  /**
   * True when the wallet covered the full amount and the booking was settled
   * server-side — skip the gateway SDK and confirm directly.
   */
  paid: boolean;
}

export interface VerifyPaymentResult {
  bookingId: string;
  status: string;
  alreadyProcessed: boolean;
}

/**
 * Create a payment order on the server. Returns the session ID the
 * Cashfree SDK needs to open checkout.
 *
 * NOTE: we deliberately do NOT send a static X-Idempotency-Key here.
 * Cashfree session tokens are single-use and short-lived, so replaying a
 * cached order response (which a stable key like `pay-order-${bookingId}`
 * caused) handed the SDK a dead token → "token is not present". Idempotency
 * is instead enforced server-side: the Cashfree order_id is our bookingId,
 * and the provider re-fetches a FRESH session for an existing ACTIVE order on
 * every Pay attempt, so retries always get a live token.
 */
export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: ({
      bookingId,
      customerEmail,
      useWallet,
    }: {
      bookingId: string;
      customerEmail?: string;
      useWallet?: boolean;
    }) =>
      apiFetch<CreatePaymentOrderResult>('/payments/order', {
        method: 'POST',
        body: {
          bookingId,
          ...(customerEmail ? { customerEmail } : {}),
          ...(useWallet !== undefined ? { useWallet } : {}),
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
