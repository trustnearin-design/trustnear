import { prisma, type ProAvailability, type BookingStatus } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

/**
 * Pro-side endpoints — everything scoped to "me" (the authenticated pro).
 * Looks up the Professional row by userId so the JWT's `sub` claim is the
 * only input that needs to be trusted.
 */

async function requireProByUserId(userId: string) {
  const pro = await prisma.professional.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }
  return pro;
}

/**
 * Full self profile — title, bio, KYC, badge, services, schedule, metrics.
 * The Pro app's Home + Profile tabs read from this.
 */
export async function getMyProfile(userId: string) {
  const pro = await prisma.professional.findUnique({
    where: { userId },
    select: {
      id: true,
      professionalTitle: true,
      bio: true,
      yearsExperience: true,
      trustScore: true,
      trustBadge: true,
      availabilityStatus: true,
      // Phase 3g — drives wizard guard on Pro app client
      approvalStatus: true,
      submittedForReviewAt: true,
      approvedAt: true,
      rejectionReason: true,
      rejectionFields: true,
      aadhaarVerified: true,
      faceVerified: true,
      panVerified: true,
      bankVerified: true,
      policeVerified: true,
      policeDocStatus: true,
      introVideoUrl: true,
      totalBookings: true,
      repeatClientCount: true,
      cancellationCount: true,
      avgResponseTimeSeconds: true,
      isSubscriptionActive: true,
      subscriptionPlan: true,
      // Personal-info fields — let the onboarding "personal" step prefill on
      // resume / rejection re-fix instead of forcing full re-entry.
      gender: true,
      dob: true,
      languagesSpoken: true,
      currentAddress: true,
      // Service radius — needed to prefill the post-approval "edit area" map.
      serviceRadiusKm: true,
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          profilePhoto: true,
          city: true,
          area: true,
          latitude: true,
          longitude: true,
        },
      },
      serviceOfferings: {
        where: { isActive: true },
        select: {
          experienceYears: true,
          customPrice: true,
          category: {
            select: {
              id: true,
              slug: true,
              name: true,
              iconUrl: true,
              basePrice: true,
              priceUnit: true,
            },
          },
        },
      },
      schedules: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isAvailable: true,
        },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }
  return pro;
}

/**
 * Self-edit the pro's presentation fields (title / bio / experience /
 * languages). Available any time — including after approval — without
 * triggering re-review, since none of these affect verification. Only the
 * provided keys are written (partial PATCH).
 */
export async function saveProfileDetails(
  userId: string,
  data: {
    professionalTitle?: string | undefined;
    bio?: string | undefined;
    yearsExperience?: number | undefined;
    languagesSpoken?: string[] | undefined;
  },
): Promise<{ ok: true }> {
  const pro = await requireProByUserId(userId);
  await prisma.professional.update({
    where: { id: pro.id },
    data: {
      ...(data.professionalTitle !== undefined
        ? { professionalTitle: data.professionalTitle }
        : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.yearsExperience !== undefined ? { yearsExperience: data.yearsExperience } : {}),
      ...(data.languagesSpoken !== undefined ? { languagesSpoken: data.languagesSpoken } : {}),
    },
  });
  return { ok: true };
}

/**
 * Toggle availability status. The matcher only considers pros with
 * `availabilityStatus === 'online'`, so flipping this is what controls
 * whether a pro receives match requests.
 */
export async function setMyAvailability(
  userId: string,
  status: ProAvailability,
): Promise<{ availabilityStatus: ProAvailability }> {
  const pro = await requireProByUserId(userId);
  const updated = await prisma.professional.update({
    where: { id: pro.id },
    data: { availabilityStatus: status },
    select: { availabilityStatus: true },
  });
  return updated;
}

/**
 * Today's snapshot — number of bookings completed today, sum earned, and
 * the count of bookings still in flight. "Earned" is the customer-paid
 * total minus platform commission (rate stored on the category at the
 * time of booking). Tips not yet tracked.
 */
export async function getMyTodaySummary(userId: string): Promise<{
  jobsCompleted: number;
  jobsActive: number;
  earnedPaise: number;
  ratingAvg: number | null;
}> {
  const pro = await requireProByUserId(userId);

  // "Today" = since local midnight in IST. Server is UTC, so subtract 5.5h.
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  istNow.setUTCHours(0, 0, 0, 0);
  const istMidnightUtc = new Date(istNow.getTime() - istOffsetMs);

  const ACTIVE: BookingStatus[] = [
    'matched',
    'confirmed',
    'pro_en_route',
    'otp_verified',
    'in_progress',
  ];

  const [completed, active, ratingAgg] = await Promise.all([
    prisma.booking.findMany({
      where: {
        professionalId: pro.id,
        status: 'completed',
        completedAt: { gte: istMidnightUtc },
      },
      select: { totalAmount: true, commission: true },
    }),
    prisma.booking.count({
      where: {
        professionalId: pro.id,
        status: { in: ACTIVE },
      },
    }),
    prisma.review.aggregate({
      where: { professionalId: pro.id, isPublic: true },
      _avg: { rating: true },
    }),
  ]);

  const earnedPaise = completed.reduce((sum, b) => sum + (b.totalAmount - b.commission), 0);

  return {
    jobsCompleted: completed.length,
    jobsActive: active,
    earnedPaise,
    ratingAvg: ratingAgg._avg.rating == null ? null : Number(ratingAgg._avg.rating),
  };
}

export type MyJobsSegment = 'pending' | 'active' | 'history';

/**
 * Jobs grouped by the segment the Pro app's Jobs tab cares about:
 *   pending  → matched (newly assigned, needs Pro to accept)
 *   active   → confirmed / pro_en_route / otp_verified / in_progress
 *   history  → completed / cancelled_* / disputed
 */
export async function getMyJobs(
  userId: string,
  segment: MyJobsSegment,
  limit = 20,
): Promise<
  Array<{
    id: string;
    bookingNumber: string;
    status: BookingStatus;
    scheduledAt: Date;
    completedAt: Date | null;
    durationMinutes: number;
    addressLine: string;
    addressArea: string | null;
    totalAmount: number;
    proPayout: number;
    paymentStatus: string;
    category: { id: string; slug: string; name: string };
    customer: { id: string; fullName: string; profilePhoto: string | null };
  }>
> {
  const pro = await requireProByUserId(userId);
  const statuses: BookingStatus[] =
    segment === 'pending'
      ? ['matched']
      : segment === 'active'
        ? ['confirmed', 'pro_en_route', 'otp_verified', 'in_progress']
        : ['completed', 'cancelled_customer', 'cancelled_pro', 'disputed'];

  const rows = await prisma.booking.findMany({
    where: {
      professionalId: pro.id,
      status: { in: statuses },
    },
    orderBy: [{ scheduledAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      durationMinutes: true,
      addressLine: true,
      addressArea: true,
      totalAmount: true,
      proPayout: true,
      paymentStatus: true,
      category: { select: { id: true, slug: true, name: true } },
      customer: { select: { id: true, fullName: true, profilePhoto: true } },
    },
  });
  return rows;
}
