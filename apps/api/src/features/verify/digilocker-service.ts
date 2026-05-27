import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, ForbiddenError, NotFoundError } from '@sevalink/types';
import { logger } from '../../logger.js';
import { applyScoreEvent } from '../trust-score/service.js';
import { setuFetch } from './setu-client.js';

/**
 * DigiLocker via Setu — user-consented Aadhaar fetch.
 *
 * Flow (per Setu DigiLocker docs):
 *   1. POST /api/digilocker — backend creates a "request" with a redirect URL.
 *      Response includes a hosted DigiLocker URL the user must open.
 *   2. User opens that URL in a WebView (Pro app), logs into DigiLocker
 *      (their phone + OTP), grants TrustNear permission to fetch Aadhaar.
 *   3. DigiLocker redirects back to our redirect URL with the same request id.
 *      The Pro app catches that redirect (via WebView's onNavigationStateChange)
 *      and calls our completion endpoint.
 *   4. Backend GETs /api/digilocker/{id}/aadhaar — gets the signed Aadhaar
 *      XML which Setu has already parsed into JSON for us.
 *   5. We extract name, DOB, gender, last 4 of Aadhaar, photo URL → write
 *      to Professional + flip aadhaarVerified true.
 *
 * Why we DON'T store the full Aadhaar number: per UIDAI's 2023 rules,
 * private (non-AUA) entities must NOT retain the 12-digit Aadhaar. We
 * keep only the last 4 digits for display + the verified fields.
 *
 * Setu sandbox redirect URL must be whitelisted in their dashboard.
 * For dev, we use a deeplink the Pro app intercepts via expo-linking.
 */

const REDIRECT_URL_DEFAULT = 'trustnearpro://kyc/digilocker/callback';

interface SetuDigilockerCreateResponse {
  id: string;
  url: string;
  status: string;
  validUpto?: string;
  redirectUrl?: string;
}

interface SetuDigilockerAadhaarResponse {
  status?: string;
  aadhaar?: {
    name?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: {
      house?: string;
      street?: string;
      landmark?: string;
      locality?: string;
      district?: string;
      state?: string;
      country?: string;
      pincode?: string;
      postOffice?: string;
      subDistrict?: string;
      vtcName?: string;
    };
    maskedAadhaarNumber?: string;
    photo?: string; // base64 OR signed URL depending on response shape
    photoUrl?: string;
    referenceId?: string;
  };
}

/**
 * Start a DigiLocker session. Returns the URL the Pro app should load in
 * a WebView + the request id we use to complete the flow.
 */
export async function startDigilockerSession(args: {
  proUserId: string;
  redirectUrl?: string;
}): Promise<{ requestId: string; redirectUrl: string; expiresAt: string | null }> {
  const pro = await prisma.professional.findUnique({
    where: { userId: args.proUserId },
    select: { id: true, aadhaarVerified: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found');
  }
  if (pro.aadhaarVerified) {
    throw new DomainError(ErrorCode.SL_903_CONFLICT, 'Aadhaar already verified', 409);
  }

  const body = {
    redirectUrl: args.redirectUrl ?? REDIRECT_URL_DEFAULT,
    docType: 'ADHAR',
  };
  const resp = await setuFetch<SetuDigilockerCreateResponse>('/api/digilocker', {
    method: 'POST',
    body,
  });

  await prisma.professional.update({
    where: { id: pro.id },
    data: { digilockerRequestId: resp.id, kycUpdatedAt: new Date() },
  });

  logger.info(
    { professionalId: pro.id, digilockerRequestId: resp.id },
    'digilocker: session started',
  );
  return {
    requestId: resp.id,
    redirectUrl: resp.url,
    expiresAt: resp.validUpto ?? null,
  };
}

/**
 * Complete a DigiLocker session — fetch the Aadhaar payload from Setu
 * and write the verified fields to Professional. Caller passes the
 * requestId the user just finished with.
 */
export async function completeDigilockerSession(args: {
  proUserId: string;
  requestId: string;
}): Promise<{
  aadhaarVerified: boolean;
  fullName: string | null;
  lastFour: string | null;
  dob: string | null;
}> {
  const pro = await prisma.professional.findUnique({
    where: { userId: args.proUserId },
    select: { id: true, digilockerRequestId: true, aadhaarVerified: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found');
  }
  if (pro.digilockerRequestId !== args.requestId) {
    throw new ForbiddenError('This DigiLocker session does not belong to you');
  }

  const resp = await setuFetch<SetuDigilockerAadhaarResponse>(
    `/api/digilocker/${args.requestId}/aadhaar`,
  );
  const aadhaar = resp.aadhaar;
  if (!aadhaar) {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      'Setu returned no Aadhaar payload — user may not have completed DigiLocker',
      502,
    );
  }

  const lastFour = extractLastFour(aadhaar.maskedAadhaarNumber);
  const dob = aadhaar.dateOfBirth ? new Date(aadhaar.dateOfBirth) : null;
  // Setu's `photo` field is sometimes a signed URL, sometimes base64.
  // We persist whichever one came back; UI handles both at render time.
  const photoUrl = aadhaar.photoUrl ?? aadhaar.photo ?? null;

  const updated = await prisma.professional.update({
    where: { id: pro.id },
    data: {
      aadhaarVerified: true,
      aadhaarLastFour: lastFour,
      aadhaarFullName: aadhaar.name ?? null,
      aadhaarDob: dob,
      aadhaarPhotoUrl: photoUrl,
      kycUpdatedAt: new Date(),
    },
    select: {
      aadhaarVerified: true,
      aadhaarFullName: true,
      aadhaarLastFour: true,
      aadhaarDob: true,
    },
  });

  // Trust score: Aadhaar verified is a meaningful signal — fire the same
  // event used by the legacy KYC path so the bonus shows immediately.
  await applyScoreEvent({
    professionalId: pro.id,
    eventType: 'aadhaar_verified',
  }).catch((err: unknown) => {
    logger.error({ err, professionalId: pro.id }, 'trust: aadhaar score event failed');
  });

  logger.info(
    { professionalId: pro.id, fullName: aadhaar.name, lastFour },
    'digilocker: aadhaar verified',
  );

  return {
    aadhaarVerified: updated.aadhaarVerified,
    fullName: updated.aadhaarFullName,
    lastFour: updated.aadhaarLastFour,
    dob: updated.aadhaarDob ? updated.aadhaarDob.toISOString().slice(0, 10) : null,
  };
}

/**
 * Extract the last 4 of the Aadhaar from Setu's masked string. Setu sends
 * something like "XXXX-XXXX-1234" or "XXXXXXXX1234"; we tolerate both.
 */
function extractLastFour(masked: string | undefined | null): string | null {
  if (!masked) return null;
  const digits = masked.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}
