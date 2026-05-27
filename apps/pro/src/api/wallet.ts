import { useQuery } from '@tanstack/react-query';
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
  walletBalance: number;
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
    queryFn: () => apiFetch<WalletBalance>('/api/v1/wallet/balance'),
    staleTime: 30_000,
  });
}

export function useWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: ['wallet', 'transactions', limit],
    queryFn: () =>
      apiFetch<{ transactions: WalletTxn[]; count: number }>(
        `/api/v1/wallet/transactions?limit=${limit}`,
      ),
    staleTime: 15_000,
  });
}
