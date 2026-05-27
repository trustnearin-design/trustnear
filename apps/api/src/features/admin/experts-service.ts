import { prisma, type TrustBadge, type ProAvailability } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

const EXPERT_LIST_SELECT = {
  id: true,
  professionalTitle: true,
  trustScore: true,
  trustBadge: true,
  availabilityStatus: true,
  aadhaarVerified: true,
  panVerified: true,
  bankVerified: true,
  policeVerified: true,
  totalBookings: true,
  repeatClientCount: true,
  cancellationCount: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      profilePhoto: true,
      city: true,
      area: true,
      isActive: true,
    },
  },
} as const;

export async function listExperts(args: {
  search?: string | undefined;
  badge?: TrustBadge | undefined;
  availability?: ProAvailability | undefined;
  city?: string | undefined;
  kycComplete?: boolean | undefined;
  sortBy?: 'trustScore' | 'totalBookings' | 'createdAt';
  sortDir?: 'asc' | 'desc';
  limit: number;
  cursor?: string | undefined;
}) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (args.badge) where['trustBadge'] = args.badge;
  if (args.availability) where['availabilityStatus'] = args.availability;
  if (args.kycComplete === true) {
    where['aadhaarVerified'] = true;
    where['panVerified'] = true;
    where['bankVerified'] = true;
    where['policeVerified'] = true;
  }

  const userWhere: Record<string, unknown> = {};
  if (args.city) userWhere['city'] = args.city;
  if (args.search) {
    const q = args.search.trim();
    userWhere['OR'] = [
      { phone: { contains: q } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (Object.keys(userWhere).length > 0) where['user'] = userWhere;

  const sortBy = args.sortBy ?? 'trustScore';
  const sortDir = args.sortDir ?? 'desc';

  const rows = await prisma.professional.findMany({
    where,
    // Secondary sort by createdAt desc to keep ordering stable when the
    // primary column has ties (lots of fresh pros share trustScore=0).
    orderBy: [{ [sortBy]: sortDir }, { createdAt: 'desc' }],
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: EXPERT_LIST_SELECT,
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

export async function getExpertDetail(id: string) {
  const expert = await prisma.professional.findUnique({
    where: { id },
    select: {
      ...EXPERT_LIST_SELECT,
      bio: true,
      yearsExperience: true,
      avgResponseTimeSeconds: true,
      isSubscriptionActive: true,
      subscriptionPlan: true,
      subscriptionExpiresAt: true,
      portfolioUrls: true,
      certifications: true,
      panFullName: true,
      panNumber: true,
      aadhaarFullName: true,
      aadhaarLastFour: true,
      bankAccountHolderName: true,
      ifscCode: true,
      kycUpdatedAt: true,
      serviceOfferings: {
        select: {
          id: true,
          isActive: true,
          customPrice: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      schedules: {
        select: { dayOfWeek: true, startTime: true, endTime: true, isAvailable: true },
        orderBy: { dayOfWeek: 'asc' },
      },
      _count: {
        select: { bookings: true, reviews: true, trustEvents: true },
      },
    },
  });
  if (!expert) throw new NotFoundError('Expert not found');
  return expert;
}

export interface UpdateExpertPatch {
  // User-table
  profilePhoto?: string | undefined;
  fullName?: string | undefined;
  // Professional-table
  professionalTitle?: string | undefined;
  bio?: string | undefined;
  yearsExperience?: number | undefined;
  portfolioUrls?: string[] | undefined;
  certifications?: string[] | undefined;
  introVideoUrl?: string | undefined;
}

/**
 * Admin edit of an expert's profile. Splits the patch into user-table and
 * professional-table updates and runs them in one transaction so partial
 * failures roll back. Empty-string URL fields are normalized to `null` to
 * support clearing a photo / video without a separate delete endpoint.
 *
 * Returns the updated expert detail shape (same as getExpertDetail) so the
 * admin UI can drop the response into its existing render path.
 */
export async function updateExpert(input: { expertId: string; patch: UpdateExpertPatch }) {
  const existing = await prisma.professional.findUnique({
    where: { id: input.expertId },
    select: { id: true, userId: true },
  });
  if (!existing) throw new NotFoundError('Expert not found');

  const userData: Record<string, unknown> = {};
  if ('profilePhoto' in input.patch) {
    userData['profilePhoto'] = input.patch.profilePhoto || null;
  }
  if (input.patch.fullName !== undefined) {
    userData['fullName'] = input.patch.fullName;
  }

  const proData: Record<string, unknown> = {};
  if (input.patch.professionalTitle !== undefined) {
    proData['professionalTitle'] = input.patch.professionalTitle;
  }
  if (input.patch.bio !== undefined) proData['bio'] = input.patch.bio;
  if (input.patch.yearsExperience !== undefined) {
    proData['yearsExperience'] = input.patch.yearsExperience;
  }
  if (input.patch.portfolioUrls !== undefined) {
    proData['portfolioUrls'] = input.patch.portfolioUrls;
  }
  if (input.patch.certifications !== undefined) {
    proData['certifications'] = input.patch.certifications;
  }
  if ('introVideoUrl' in input.patch) {
    proData['introVideoUrl'] = input.patch.introVideoUrl || null;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: existing.userId }, data: userData });
    }
    if (Object.keys(proData).length > 0) {
      await tx.professional.update({ where: { id: existing.id }, data: proData });
    }
  });

  return getExpertDetail(input.expertId);
}

/**
 * Admin override of trust score. Used for manual corrections + onboarding
 * boosts (e.g. transferring a veteran from another platform). The change
 * also bumps the badge tier per existing thresholds.
 */
export async function setTrustOverride(input: {
  expertId: string;
  trustScore: number;
  trustBadge: TrustBadge;
  actorId: string;
}) {
  const existing = await prisma.professional.findUnique({
    where: { id: input.expertId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Expert not found');

  const updated = await prisma.professional.update({
    where: { id: input.expertId },
    data: {
      trustScore: input.trustScore,
      trustBadge: input.trustBadge,
    },
    select: { id: true, trustScore: true, trustBadge: true },
  });
  return updated;
}
