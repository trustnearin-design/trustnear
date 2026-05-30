/**
 * Fast-seed a fully BOOKABLE test professional for E2E testing.
 *
 * Creates/updates (idempotent on phone) a pro that passes every gate the
 * customer flow checks:
 *   - approvalStatus = 'approved'      (Phase 3g trust gate)
 *   - availabilityStatus = 'online'    (match + direct-book require it)
 *   - user.isActive + profilePhoto set (by-category + nearby require photo)
 *   - one active ProServiceOffering on the target category
 *   - ProLocation at Jaipur (for the live-tracking map default)
 *   - full week ProSchedule 07:00–21:00
 *
 * Usage (from repo root):
 *   PRO_PHONE="+91XXXXXXXXXX" PRO_NAME="Test Pro" CATEGORY_SLUG="home-cleaning" \
 *     pnpm --filter @sevalink/db exec dotenv -e ../../.env.local -- tsx prisma/seed-test-pro.ts
 *
 * Defaults: CATEGORY_SLUG=home-cleaning, PRO_NAME="Test Pro", Jaipur coords.
 */
import { prisma } from '../src/index';

const PHONE = process.env['PRO_PHONE'];
const NAME = process.env['PRO_NAME'] ?? 'Test Pro';
const CATEGORY_SLUG = process.env['CATEGORY_SLUG'] ?? 'home-cleaning';
// Jaipur city centre — only used for the tracking-map default; discovery is
// NOT location-gated so this does not affect whether the pro is bookable.
const LAT = Number(process.env['PRO_LAT'] ?? '26.9124');
const LNG = Number(process.env['PRO_LNG'] ?? '75.7873');

if (!PHONE || !/^\+91\d{10}$/.test(PHONE)) {
  console.error('ERROR: set PRO_PHONE="+91XXXXXXXXXX" (E.164, +91 + 10 digits)');
  process.exit(1);
}

function referralCode(seed: string): string {
  // Deterministic-ish unique code so re-runs reuse the same user row.
  return ('TP' + seed.replace(/\D/g, '').slice(-8)).toUpperCase();
}

async function main() {
  const category = await prisma.serviceCategory.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true, name: true, basePrice: true },
  });
  if (!category) throw new Error(`Category not found: ${CATEGORY_SLUG}`);

  // 1) User (upsert on phone)
  const user = await prisma.user.upsert({
    where: { phone: PHONE! },
    update: {
      fullName: NAME,
      role: 'professional',
      isActive: true,
      profilePhoto: `https://i.pravatar.cc/300?u=${encodeURIComponent(PHONE!)}`,
      city: 'Jaipur',
      area: 'Vaishali Nagar',
    },
    create: {
      phone: PHONE!,
      fullName: NAME,
      role: 'professional',
      isActive: true,
      isVerified: true,
      profilePhoto: `https://i.pravatar.cc/300?u=${encodeURIComponent(PHONE!)}`,
      city: 'Jaipur',
      area: 'Vaishali Nagar',
      preferredLang: 'hi',
      referralCode: referralCode(PHONE!),
    },
  });

  // 2) Professional (upsert on userId) — fully approved + online + verified
  const pro = await prisma.professional.upsert({
    where: { userId: user.id },
    update: {
      professionalTitle: `TrustNear ${category.name} Pro`,
      approvalStatus: 'approved',
      availabilityStatus: 'online',
      trustScore: 88,
      trustBadge: 'gold',
      aadhaarVerified: true,
      panVerified: true,
      bankVerified: true,
      policeVerified: true,
      yearsExperience: 5,
      approvedAt: new Date(),
    },
    create: {
      userId: user.id,
      professionalTitle: `TrustNear ${category.name} Pro`,
      bio: 'Seeded test professional for E2E booking flow.',
      approvalStatus: 'approved',
      availabilityStatus: 'online',
      trustScore: 88,
      trustBadge: 'gold',
      aadhaarVerified: true,
      panVerified: true,
      bankVerified: true,
      policeVerified: true,
      yearsExperience: 5,
      serviceRadiusKm: 12,
      approvedAt: new Date(),
    },
  });

  // 3) Service offering (upsert on [professionalId, categoryId])
  await prisma.proServiceOffering.upsert({
    where: { professionalId_categoryId: { professionalId: pro.id, categoryId: category.id } },
    update: { isActive: true },
    create: {
      professionalId: pro.id,
      categoryId: category.id,
      isActive: true,
      experienceYears: 5,
    },
  });

  // 4) Location (upsert on professionalId)
  await prisma.proLocation.upsert({
    where: { professionalId: pro.id },
    update: { latitude: LAT, longitude: LNG, updatedAt: new Date() },
    create: { professionalId: pro.id, latitude: LAT, longitude: LNG },
  });

  // 5) Schedule — all 7 days 07:00–21:00 (upsert on [professionalId, dayOfWeek])
  for (let day = 0; day < 7; day++) {
    await prisma.proSchedule.upsert({
      where: { professionalId_dayOfWeek: { professionalId: pro.id, dayOfWeek: day } },
      update: { startTime: '07:00', endTime: '21:00', isAvailable: true },
      create: {
        professionalId: pro.id,
        dayOfWeek: day,
        startTime: '07:00',
        endTime: '21:00',
        isAvailable: true,
      },
    });
  }

  console.log(
    'SEEDED-PRO ' +
      JSON.stringify({
        proId: pro.id,
        userId: user.id,
        phone: PHONE,
        name: NAME,
        category: CATEGORY_SLUG,
        approval: 'approved',
        availability: 'online',
      }),
  );
}

main()
  .catch((e) => {
    console.error('SEED-FAILED', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
