import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

export type KycQueueFilter = 'pending' | 'partial' | 'complete' | 'all';

/**
 * Surface pros to the KYC review queue. The "queue" is everyone who is not
 * fully verified yet — admin's job is to push them through. Sorted by most
 * recent submission so anything fresh bubbles to the top.
 */
export async function listKycQueue(filter: KycQueueFilter = 'pending', limit = 50) {
  const where = (() => {
    switch (filter) {
      case 'complete':
        return {
          aadhaarVerified: true,
          panVerified: true,
          bankVerified: true,
          policeVerified: true,
        };
      case 'pending':
        // Nothing started yet (or only one verification).
        return {
          AND: [
            { aadhaarVerified: false },
            { panVerified: false },
            { bankVerified: false },
            { policeVerified: false },
          ],
        };
      case 'partial':
        // Started but not finished.
        return {
          AND: [
            {
              OR: [
                { aadhaarVerified: true },
                { panVerified: true },
                { bankVerified: true },
                { policeVerified: true },
              ],
            },
            {
              OR: [
                { aadhaarVerified: false },
                { panVerified: false },
                { bankVerified: false },
                { policeVerified: false },
              ],
            },
          ],
        };
      case 'all':
      default:
        return {};
    }
  })();

  const pros = await prisma.professional.findMany({
    where,
    orderBy: [{ kycUpdatedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      professionalTitle: true,
      trustBadge: true,
      trustScore: true,
      aadhaarVerified: true,
      panVerified: true,
      bankVerified: true,
      policeVerified: true,
      kycUpdatedAt: true,
      createdAt: true,
      user: {
        select: { id: true, fullName: true, phone: true, profilePhoto: true, city: true },
      },
    },
  });

  return pros.map((p) => ({
    ...p,
    verifiedCount: [p.aadhaarVerified, p.panVerified, p.bankVerified, p.policeVerified].filter(
      Boolean,
    ).length,
  }));
}

export async function getKycDetail(professionalId: string) {
  const pro = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      id: true,
      professionalTitle: true,
      bio: true,
      yearsExperience: true,
      trustScore: true,
      trustBadge: true,
      availabilityStatus: true,
      aadhaarVerified: true,
      aadhaarLastFour: true,
      aadhaarFullName: true,
      aadhaarDob: true,
      aadhaarPhotoUrl: true,
      panVerified: true,
      panNumber: true,
      panFullName: true,
      bankVerified: true,
      bankAccountLastFour: true,
      bankAccountHolderName: true,
      ifscCode: true,
      policeVerified: true,
      faceVerified: true,
      kycUpdatedAt: true,
      createdAt: true,
      totalBookings: true,
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          profilePhoto: true,
          city: true,
          area: true,
          createdAt: true,
        },
      },
    },
  });
  if (!pro) throw new NotFoundError('Professional not found');
  return {
    ...pro,
    verifiedCount: [
      pro.aadhaarVerified,
      pro.panVerified,
      pro.bankVerified,
      pro.policeVerified,
    ].filter(Boolean).length,
  };
}

/**
 * Admin-overridable verification flags. Today this is mainly the manual
 * police-verification flag (no API to verify) but admins also need a break-
 * glass to re-mark any field if Setu glitches. Each toggle stamps
 * kycUpdatedAt so the queue re-sorts.
 */
export type AdminVerifyField = 'aadhaar' | 'pan' | 'bank' | 'police' | 'face';

export async function setVerification(input: {
  professionalId: string;
  field: AdminVerifyField;
  value: boolean;
}) {
  const data = (() => {
    const now = new Date();
    switch (input.field) {
      case 'aadhaar':
        return { aadhaarVerified: input.value, kycUpdatedAt: now };
      case 'pan':
        return { panVerified: input.value, kycUpdatedAt: now };
      case 'bank':
        return { bankVerified: input.value, kycUpdatedAt: now };
      case 'police':
        return { policeVerified: input.value, kycUpdatedAt: now };
      case 'face':
        return { faceVerified: input.value, kycUpdatedAt: now };
    }
  })();

  const updated = await prisma.professional.update({
    where: { id: input.professionalId },
    data,
    select: {
      id: true,
      aadhaarVerified: true,
      panVerified: true,
      bankVerified: true,
      policeVerified: true,
      faceVerified: true,
      kycUpdatedAt: true,
    },
  });
  return updated;
}
