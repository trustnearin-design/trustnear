import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';
import { logger } from '../../logger.js';
import { setuFetch } from './setu-client.js';

/**
 * Bank Account Verification via Setu BAV Pennyless — no ₹1 sent, just
 * "does this account exist + what's the holder name?" via the NPCI rails.
 *
 * Setu BAV endpoint (per docs):
 *   POST /api/verify/ban  { ifsc: "...", accountNumber: "..." }
 *   → { verification: "success" | ..., data: { accountHolderName, ... } }
 *
 * Same name-match policy as PAN: the BAV-returned account holder name
 * must match the pro's signup name (lenient comparison). Mismatch hard-
 * fails so a pro can't use someone else's account for payouts.
 *
 * Why we don't ALSO write to Razorpay payouts: that's a separate flow
 * (creating a Razorpay Contact + FundAccount) that runs at first-payout
 * time, not at KYC time. Keeping verification cheap + idempotent.
 */

interface SetuBavResponse {
  verification?: string;
  message?: string;
  data?: {
    accountHolderName?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountNumber?: string;
  };
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function verifyBank(args: {
  proUserId: string;
  accountNumber: string;
  ifsc: string;
}): Promise<{
  bankVerified: boolean;
  accountLastFour: string;
  holderName: string | null;
  bankName: string | null;
}> {
  const accountNumber = args.accountNumber.replace(/\s+/g, '');
  const ifsc = args.ifsc.trim().toUpperCase();

  if (!/^\d{9,18}$/.test(accountNumber)) {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      'Invalid account number — expected 9 to 18 digits',
      422,
    );
  }
  if (!IFSC_REGEX.test(ifsc)) {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      'Invalid IFSC format — expected like HDFC0000001',
      422,
    );
  }

  const pro = await prisma.professional.findUnique({
    where: { userId: args.proUserId },
    select: {
      id: true,
      bankVerified: true,
      user: { select: { fullName: true } },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found');
  }
  if (pro.bankVerified) {
    throw new DomainError(ErrorCode.SL_903_CONFLICT, 'Bank already verified', 409);
  }

  const resp = await setuFetch<SetuBavResponse>('/api/verify/ban', {
    method: 'POST',
    body: { ifsc, accountNumber },
  });

  const status = (resp.verification ?? '').toLowerCase();
  if (status && status !== 'success') {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      `Bank verification failed: ${resp.message ?? status}`,
      422,
    );
  }

  const holderName = resp.data?.accountHolderName ?? null;
  if (holderName && !namesRoughlyMatch(holderName, pro.user.fullName)) {
    logger.warn(
      {
        professionalId: pro.id,
        signupName: pro.user.fullName,
        bankName: holderName,
      },
      'bav: name mismatch — refusing to mark verified',
    );
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      `Account belongs to "${holderName}", not "${pro.user.fullName}". Use a bank account in your own name.`,
      422,
    );
  }

  const lastFour = accountNumber.slice(-4);
  // We do NOT persist the full account number. It is only needed transiently
  // for the BAV verify call above; nothing reads it back (payouts use the
  // gateway), and storing it plaintext in `accountNumberEncrypted` (no
  // encryption-at-rest exists) was a PII risk. We keep only the last four for
  // display. If full-number storage is ever required, add real KMS/AES
  // encryption first and write the ciphertext here.
  await prisma.professional.update({
    where: { id: pro.id },
    data: {
      bankVerified: true,
      bankAccountLastFour: lastFour,
      bankAccountHolderName: holderName,
      ifscCode: ifsc,
      kycUpdatedAt: new Date(),
    },
  });

  logger.info(
    { professionalId: pro.id, lastFour, bankName: resp.data?.bankName },
    'bav: bank verified',
  );

  return {
    bankVerified: true,
    accountLastFour: lastFour,
    holderName,
    bankName: resp.data?.bankName ?? null,
  };
}

function namesRoughlyMatch(verified: string, claimed: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  const v = new Set(norm(verified));
  const c = norm(claimed);
  return c.every((tok) => v.has(tok));
}
