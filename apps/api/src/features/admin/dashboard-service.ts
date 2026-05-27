import { prisma } from '@sevalink/db';

/**
 * Window helper — returns start-of-day in IST shifted N days back.
 * IST (UTC+05:30) is hard-coded since TrustNear is India-only for now.
 * Switch to TZ from user config if multi-region launches.
 */
function istDaysAgo(days: number): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  istNow.setUTCDate(istNow.getUTCDate() - days);
  // shift back to UTC for the DB
  return new Date(istNow.getTime() - 5.5 * 60 * 60 * 1000);
}

/**
 * Aggregate metrics for the admin dashboard. Built as a single Promise.all
 * so the dashboard renders in one round-trip — each window is one COUNT.
 */
export async function getDashboardMetrics() {
  const startToday = istDaysAgo(0);
  const start7d = istDaysAgo(6);
  const start30d = istDaysAgo(29);

  const [
    usersTotal,
    usersToday,
    prosTotal,
    prosKycComplete,
    prosKycPending,
    prosAvailable,
    bookingsToday,
    bookings7d,
    bookings30d,
    activeBookings,
    gmvToday,
    gmv7d,
    gmv30d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startToday } } }),
    prisma.professional.count(),
    prisma.professional.count({
      where: {
        aadhaarVerified: true,
        panVerified: true,
        bankVerified: true,
        policeVerified: true,
      },
    }),
    prisma.professional.count({
      where: {
        OR: [
          { aadhaarVerified: false },
          { panVerified: false },
          { bankVerified: false },
          { policeVerified: false },
        ],
      },
    }),
    prisma.professional.count({ where: { availabilityStatus: 'online' } }),
    prisma.booking.count({ where: { createdAt: { gte: startToday } } }),
    prisma.booking.count({ where: { createdAt: { gte: start7d } } }),
    prisma.booking.count({ where: { createdAt: { gte: start30d } } }),
    prisma.booking.count({
      where: {
        status: { in: ['matched', 'confirmed', 'pro_en_route', 'otp_verified', 'in_progress'] },
      },
    }),
    sumPaidGmv(startToday),
    sumPaidGmv(start7d),
    sumPaidGmv(start30d),
  ]);

  return {
    users: { total: usersTotal, newToday: usersToday },
    pros: {
      total: prosTotal,
      kycComplete: prosKycComplete,
      kycPending: prosKycPending,
      online: prosAvailable,
    },
    bookings: {
      today: bookingsToday,
      last7d: bookings7d,
      last30d: bookings30d,
      activeNow: activeBookings,
    },
    gmvPaise: {
      today: gmvToday,
      last7d: gmv7d,
      last30d: gmv30d,
    },
  };
}

async function sumPaidGmv(since: Date): Promise<number> {
  const agg = await prisma.booking.aggregate({
    where: { paymentStatus: 'paid', completedAt: { gte: since } },
    _sum: { totalAmount: true },
  });
  return agg._sum.totalAmount ?? 0;
}

/**
 * Recent activity feed — last N bookings across the platform with customer +
 * pro names for the dashboard's "activity" widget.
 */
export async function getRecentBookings(limit = 10) {
  return prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
      customer: { select: { fullName: true, phone: true } },
      professional: {
        select: {
          user: { select: { fullName: true, phone: true } },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Charts + breakdowns for the powered-up dashboard
// ─────────────────────────────────────────────────────────────

type DailyRow = {
  day: Date;
  bookings: bigint;
  gmv_paise: bigint;
  paid_bookings: bigint;
};

/**
 * Daily time-series for the last 30 days bucketed in IST. Zero-fills missing
 * days so the front-end line chart has a contiguous x-axis without holes.
 */
async function getDailyTimeSeries(): Promise<
  Array<{ date: string; bookings: number; gmvPaise: number; paidBookings: number }>
> {
  const rows = await prisma.$queryRaw<DailyRow[]>`
    SELECT
      date_trunc('day', "created_at" AT TIME ZONE 'Asia/Kolkata')::date AS day,
      COUNT(*)::bigint AS bookings,
      COALESCE(SUM(CASE WHEN "payment_status" = 'paid' THEN "total_amount" ELSE 0 END), 0)::bigint AS gmv_paise,
      COUNT(*) FILTER (WHERE "payment_status" = 'paid')::bigint AS paid_bookings
    FROM bookings
    WHERE "created_at" >= NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  const map = new Map<string, { bookings: number; gmvPaise: number; paidBookings: number }>();
  for (const r of rows) {
    const key = r.day.toISOString().slice(0, 10);
    map.set(key, {
      bookings: Number(r.bookings),
      gmvPaise: Number(r.gmv_paise),
      paidBookings: Number(r.paid_bookings),
    });
  }

  // Zero-fill the last 30 days
  const out: Array<{ date: string; bookings: number; gmvPaise: number; paidBookings: number }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const v = map.get(key) ?? { bookings: 0, gmvPaise: 0, paidBookings: 0 };
    out.push({ date: key, ...v });
  }
  return out;
}

type CategoryRow = {
  category_id: string;
  name: string;
  slug: string;
  bookings: bigint;
  gmv_paise: bigint;
};

/** GMV + booking count grouped by category for the last 30 days. */
async function getByCategory(): Promise<
  Array<{ categoryId: string; name: string; slug: string; bookings: number; gmvPaise: number }>
> {
  const rows = await prisma.$queryRaw<CategoryRow[]>`
    SELECT
      c.id AS category_id,
      c.name,
      c.slug,
      COUNT(b.*)::bigint AS bookings,
      COALESCE(SUM(CASE WHEN b."payment_status" = 'paid' THEN b."total_amount" ELSE 0 END), 0)::bigint AS gmv_paise
    FROM bookings b
    JOIN service_categories c ON c.id = b."category_id"
    WHERE b."created_at" >= NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.name, c.slug
    ORDER BY gmv_paise DESC
    LIMIT 10
  `;
  return rows.map((r) => ({
    categoryId: r.category_id,
    name: r.name,
    slug: r.slug,
    bookings: Number(r.bookings),
    gmvPaise: Number(r.gmv_paise),
  }));
}

/** Booking-status funnel for the last 30 days. */
async function getBookingFunnel(): Promise<Record<string, number>> {
  const since = istDaysAgo(29);
  const rows = await prisma.booking.groupBy({
    by: ['status'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count._all;
  return out;
}

/** Payment-status breakdown for the last 30 days. */
async function getPaymentBreakdown(): Promise<
  Array<{ status: string; count: number; totalPaise: number }>
> {
  const since = istDaysAgo(29);
  const rows = await prisma.booking.groupBy({
    by: ['paymentStatus'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  return rows.map((r) => ({
    status: r.paymentStatus,
    count: r._count._all,
    totalPaise: r._sum.totalAmount ?? 0,
  }));
}

type TopExpertRow = {
  id: string;
  full_name: string | null;
  phone: string;
  trust_badge: string;
  total_bookings: number;
  gmv_30d: bigint;
};

/** Top 10 experts by paid GMV in the last 30 days. */
async function getTopExperts(): Promise<
  Array<{
    id: string;
    name: string;
    phone: string;
    trustBadge: string;
    totalBookings: number;
    gmvPaise30d: number;
  }>
> {
  const rows = await prisma.$queryRaw<TopExpertRow[]>`
    SELECT
      p.id,
      u.full_name,
      u.phone,
      p.trust_badge::text AS trust_badge,
      p.total_bookings,
      COALESCE(SUM(CASE WHEN b."payment_status" = 'paid' THEN b."total_amount" ELSE 0 END), 0)::bigint AS gmv_30d
    FROM professionals p
    JOIN users u ON u.id = p."user_id"
    LEFT JOIN bookings b ON b."professional_id" = p.id AND b."created_at" >= NOW() - INTERVAL '30 days'
    GROUP BY p.id, u.full_name, u.phone, p.trust_badge, p.total_bookings
    ORDER BY gmv_30d DESC, p.total_bookings DESC
    LIMIT 10
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.full_name ?? r.phone,
    phone: r.phone,
    trustBadge: r.trust_badge,
    totalBookings: r.total_bookings,
    gmvPaise30d: Number(r.gmv_30d),
  }));
}

/** Everything the new dashboard needs in one shot. */
export async function getDashboardCharts() {
  const [daily, byCategory, funnel, paymentBreakdown, topExperts] = await Promise.all([
    getDailyTimeSeries(),
    getByCategory(),
    getBookingFunnel(),
    getPaymentBreakdown(),
    getTopExperts(),
  ]);
  return { daily, byCategory, funnel, paymentBreakdown, topExperts };
}

// ─────────────────────────────────────────────────────────────
// Alerts — small counters fed to sidebar badges + dashboard
// ─────────────────────────────────────────────────────────────

export async function getAlertCounts(): Promise<{
  kycPending: number;
  disputes: number;
  paymentFailed: number;
}> {
  const since30 = istDaysAgo(29);
  const [kycPending, disputes, paymentFailed] = await Promise.all([
    prisma.professional.count({
      where: {
        OR: [
          { aadhaarVerified: false },
          { panVerified: false },
          { bankVerified: false },
          { policeVerified: false },
        ],
      },
    }),
    prisma.booking.count({ where: { status: 'disputed' } }),
    prisma.booking.count({
      where: { paymentStatus: 'failed', createdAt: { gte: since30 } },
    }),
  ]);
  return { kycPending, disputes, paymentFailed };
}

// ─────────────────────────────────────────────────────────────
// Live ops snapshot — for the dashboard map
// ─────────────────────────────────────────────────────────────

/**
 * Snapshot of online pros + currently-active bookings with their geo. Drives
 * the live ops map without subscribing to socket streams. Refresh on a short
 * interval from the client (every 15-30s).
 *
 * Pros without a ProLocation row are skipped — that only writes when a pro
 * comes online + GPS streams in. Stale rows (>10 minutes) are also filtered
 * so the map doesn't show pros whose phones died with location still on.
 */
export async function getLiveOpsSnapshot() {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const [pros, bookings] = await Promise.all([
    prisma.professional.findMany({
      where: {
        availabilityStatus: { in: ['online', 'busy'] },
        deletedAt: null,
        location: { is: { updatedAt: { gte: tenMinAgo } } },
      },
      select: {
        id: true,
        availabilityStatus: true,
        trustBadge: true,
        location: { select: { latitude: true, longitude: true, updatedAt: true } },
        user: { select: { fullName: true, phone: true, profilePhoto: true } },
      },
      take: 200,
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ['matched', 'confirmed', 'pro_en_route', 'otp_verified', 'in_progress'] },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        addressLat: true,
        addressLng: true,
        category: { select: { name: true } },
        customer: { select: { fullName: true, phone: true } },
        professional: {
          select: { id: true, user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  return {
    pros: pros
      .filter((p) => p.location !== null)
      .map((p) => ({
        id: p.id,
        name: p.user.fullName ?? p.user.phone,
        photo: p.user.profilePhoto,
        availability: p.availabilityStatus,
        trustBadge: p.trustBadge,
        lat: Number(p.location!.latitude),
        lng: Number(p.location!.longitude),
      })),
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: b.status,
      category: b.category.name,
      customerName: b.customer.fullName ?? b.customer.phone,
      proName: b.professional?.user.fullName ?? null,
      lat: Number(b.addressLat),
      lng: Number(b.addressLng),
    })),
  };
}
