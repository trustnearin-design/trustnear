import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

/**
 * Pro KYC API surface — backed by Setu under the hood.
 *
 *   useKycStatus()    → combined snapshot of Aadhaar/PAN/Bank/Police state.
 *                       Drives the KYC home card grid + per-step screens.
 *   useStartDigilocker()  → returns the URL to open + requestId to remember.
 *   useCompleteDigilocker() → fires after the user returns from DigiLocker.
 *   useVerifyPan()    → submits PAN, flips panVerified.
 *   useVerifyBank()   → submits account+IFSC, flips bankVerified.
 *
 * The mutations all invalidate ['kyc.status'] on success so the home grid
 * + Profile tab + every consumer refreshes immediately.
 */

export interface KycStatus {
  aadhaarVerified: boolean;
  aadhaarLastFour: string | null;
  aadhaarFullName: string | null;
  aadhaarDob: string | null;
  aadhaarPhotoUrl: string | null;
  panVerified: boolean;
  panNumber: string | null;
  panFullName: string | null;
  bankVerified: boolean;
  bankAccountLastFour: string | null;
  bankAccountHolderName: string | null;
  ifscCode: string | null;
  faceVerified: boolean;
  policeVerified: boolean;
  kycUpdatedAt: string | null;
}

export interface StartDigilockerResult {
  requestId: string;
  redirectUrl: string; // the DigiLocker hosted OAuth URL the user must open
  expiresAt: string | null;
}

export interface CompleteDigilockerResult {
  aadhaarVerified: boolean;
  fullName: string | null;
  lastFour: string | null;
  dob: string | null;
}

export function useKycStatus() {
  return useQuery({
    queryKey: ['kyc.status'],
    queryFn: () => apiFetch<KycStatus>('/verify/status'),
    staleTime: 30_000,
  });
}

export function useStartDigilocker() {
  return useMutation({
    mutationFn: () =>
      apiFetch<StartDigilockerResult>('/verify/digilocker/start', {
        method: 'POST',
        body: {},
      }),
  });
}

export function useCompleteDigilocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<CompleteDigilockerResult>('/verify/digilocker/complete', {
        method: 'POST',
        body: { requestId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kyc.status'] });
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}

export function useVerifyPan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pan: string) =>
      apiFetch<{ panVerified: boolean; pan: string; fullName: string | null }>('/verify/pan', {
        method: 'POST',
        body: { pan },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kyc.status'] });
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}

export function useVerifyBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { accountNumber: string; ifsc: string }) =>
      apiFetch<{
        bankVerified: boolean;
        accountLastFour: string;
        holderName: string | null;
        bankName: string | null;
      }>('/verify/bank', { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kyc.status'] });
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}
