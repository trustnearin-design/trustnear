import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';
import { logger } from '../../logger.js';
import { setuFetch } from './setu-client.js';

/**
 * PAN verification via Setu — single round-trip to NSDL.
 *
 * Setu PAN endpoint:
 *   POST /api/verify/pan { pan: "ABCDE1234F", name: "Optional name for match" }
 *   → { id, verification: "success" | ..., data: { pan, name, ... } }
 *
 * We compare Setu's returned name with the user's signup name (case +
 * whitespace insensitive). The PRO must use the SAME name on TrustNear
 * that's on their PAN — otherwise we hard-fail the verification so an
 * attacker can't lend their PAN to someone else's account.
 */

interface SetuPanResponse {
  verification?: string;
  message?: string;
  data?: {
    pan?: string;
    name?: string;
    aadhaarSeedingStatus?: string;
    category?: string;
  };
  // Some Setu responses wrap data differently — handle both
  pan?: string;
  name?: string;
}

const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

export async function verifyPan(args: {
  proUserId: string;
  pan: string;
}): Promise<{ panVerified: boolean; pan: string; fullName: string | null }> {
  const pan = args.pan.trim().toUpperCase();
  if (!PAN_REGEX.test(pan)) {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      'Invalid PAN format — expected 5 letters + 4 digits + 1 letter',
      422,
    );
  }

  const pro = await prisma.professional.findUnique({
    where: { userId: args.proUserId },
    select: {
      id: true,
      panVerified: true,
      user: { select: { fullName: true } },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found');
  }
  if (pro.panVerified) {
    throw new DomainError(ErrorCode.SL_903_CONFLICT, 'PAN already verified', 409);
  }

  const resp = await setuFetch<SetuPanResponse>('/api/verify/pan', {
    method: 'POST',
    body: { pan, name: pro.user.fullName },
  });

  // Setu's response shape varies — pull name from whichever field came back.
  const verifiedName = resp.data?.name ?? resp.name ?? null;
  const verificationStatus = (resp.verification ?? '').toLowerCase();

  // Setu uses "success" for valid PAN; "in_progress" / "failed" for the rest.
  if (verificationStatus && verificationStatus !== 'success') {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      `PAN verification failed: ${resp.message ?? verificationStatus}`,
      422,
    );
  }

  // Name match — strict only if Setu returned a name. PAN can sometimes
  // come back valid without a name (some NSDL records are name-suppressed).
  if (verifiedName && !namesRoughlyMatch(verifiedName, pro.user.fullName)) {
    logger.warn(
      {
        professionalId: pro.id,
        signupName: pro.user.fullName,
        panName: verifiedName,
      },
      'pan: name mismatch — refusing to mark verified',
    );
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      `PAN belongs to "${verifiedName}", not "${pro.user.fullName}". Sign up with the name on your PAN.`,
      422,
    );
  }

  const updated = await prisma.professional.update({
    where: { id: pro.id },
    data: {
      panNumber: pan,
      panVerified: true,
      panFullName: verifiedName,
      kycUpdatedAt: new Date(),
    },
    select: { panVerified: true, panNumber: true, panFullName: true },
  });

  logger.info({ professionalId: pro.id, pan: maskPan(pan), name: verifiedName }, 'pan: verified');

  return {
    panVerified: updated.panVerified,
    pan: updated.panNumber ?? pan,
    fullName: updated.panFullName,
  };
}

/**
 * Lenient name comparison: case + whitespace insensitive, allows the
 * verified name to be a superset (e.g. "RAJESH KUMAR SHARMA" matches
 * "Rajesh Sharma" because both tokens appear).
 */
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
  // Every claimed token must appear in verified (handles short signup names).
  return c.every((tok) => v.has(tok));
}

function maskPan(pan: string): string {
  if (pan.length !== 10) return pan;
  return `${pan.slice(0, 3)}XXXX${pan.slice(-3)}`;
}
