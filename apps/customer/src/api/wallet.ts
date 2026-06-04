import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export type WalletTxnType = 'credit' | 'debit' | 'hold' | 'release' | 'refund';
export type WalletTxnReason =
  | 'booking_payment'
  | 'pro_payout'
  | 'referral_reward'
  | 'loyalty_redeem'
  | 'promo_credit'
  | 'wallet_topup'
  | 'refund'
  | 'adjustment';

export interface WalletBalance {
  walletBalance: number; // paise
  loyaltyPoints: number;
}

export interface WalletTxn {
  id: string;
  type: WalletTxnType;
  reason: WalletTxnReason;
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => apiFetch<WalletBalance>('/wallet/balance'),
    staleTime: 30_000,
  });
}

export function useWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: ['wallet', 'transactions', limit],
    queryFn: () =>
      apiFetch<{ transactions: WalletTxn[]; count: number }>(`/wallet/transactions?limit=${limit}`),
    staleTime: 15_000,
  });
}

// ─── Add money (top-up) ──────────────────────────────────────────────

export interface CreateTopupResult {
  topupId: string;
  paymentSessionId: string;
  providerOrderId: string;
  amountPaise: number;
  provider: string;
  environment?: 'sandbox' | 'production';
  status: string;
}

export interface VerifyTopupResult {
  topupId: string;
  status: string;
  alreadyProcessed: boolean;
  creditedPaise: number;
}

/** Start an "Add money" order — returns the gateway session to open. */
export function useCreateTopup() {
  return useMutation({
    mutationFn: (amountPaise: number) =>
      apiFetch<CreateTopupResult>('/wallet/topup', {
        method: 'POST',
        body: { amountPaise },
      }),
  });
}

/** Confirm a top-up after the gateway sheet closes. Idempotent. */
export function useVerifyTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topupId: string) =>
      apiFetch<VerifyTopupResult>('/wallet/topup/verify', {
        method: 'POST',
        body: { topupId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
