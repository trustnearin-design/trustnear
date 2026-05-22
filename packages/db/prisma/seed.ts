/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * TrustNear category hierarchy — 4 parents × 4 children each (16 leaves).
 *
 * Schema rule: parent rows have parentId === null. Leaf rows reference
 * the parent. Two-level only — no grandchildren.
 *
 * Image URLs are curated Unsplash photos sized for mobile. heroImageUrl
 * is the big photo (parent tile + leaf header), bannerUrl is the wide
 * promotional strip (currently unused but reserved).
 *
 * Pricing is the *leaf* base — parent rows still need a basePrice column
 * (schema requires it) but it's ignored at runtime; we set it to 0.
 */

interface ParentSeed {
  slug: string;
  name: string;
  shortPitch: string;
  description: string;
  heroImageUrl: string;
  sortOrder: number;
}

interface ChildSeed {
  slug: string;
  parentSlug: string;
  name: string;
  professionalTitle: string;
  shortPitch: string;
  description: string;
  heroImageUrl: string;
  basePrice: number; // paise
  priceUnit: 'per_hour' | 'per_visit';
  minDurationMinutes: number;
  searchKeywords: string[];
  sortOrder: number;
}

const parents: ParentSeed[] = [
  {
    slug: 'home-care',
    name: 'Home Care',
    shortPitch: 'Cleaning, sanitization & pest control by trained pros',
    description:
      'From a quick weekly tidy-up to deep monthly cleans, our verified Home Care pros bring their own kit and leave your home spotless.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 1,
  },
  {
    slug: 'repairs',
    name: 'Repairs',
    shortPitch: 'On-demand plumbing, electrical, AC & appliance fixes',
    description:
      'Licensed and police-verified technicians for everything that needs fixing — same-day visits for urgent issues.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 2,
  },
  {
    slug: 'beauty-wellness',
    name: 'Beauty & Wellness',
    shortPitch: 'Salon, spa & grooming at your doorstep',
    description:
      'Studio-grade salon and spa services in the comfort of your home. Trained therapists, sanitized tools, fixed prices.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 3,
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle',
    shortPitch: 'Trainers, tutors & photographers for everyday upgrades',
    description:
      'Find vetted fitness coaches, yoga instructors, school tutors and photographers — all background-checked, all near you.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 4,
  },
];

const children: ChildSeed[] = [
  // ─── Home Care ──────────────────────────────────────────────
  {
    slug: 'home-cleaning',
    parentSlug: 'home-care',
    name: 'Home Cleaning',
    professionalTitle: 'TrustNear Cleaning Pro',
    shortPitch: 'Weekly + monthly cleaning, kit included',
    description:
      'Standard home cleaning by trained pros. Includes sweeping, mopping, dusting, bathroom + kitchen scrub.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_hour',
    minDurationMinutes: 60,
    searchKeywords: ['cleaning', 'maid', 'safai', 'घर की सफाई', 'cleaner'],
    sortOrder: 1,
  },
  {
    slug: 'deep-clean',
    parentSlug: 'home-care',
    name: 'Deep Clean',
    professionalTitle: 'TrustNear Deep Clean Pro',
    shortPitch: 'Move-in / move-out scrub, every corner',
    description:
      'Intensive 4–6 hour deep clean. Hard-water stain removal, fan / AC vent cleaning, behind-furniture, kitchen degrease.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&q=80&auto=format&fit=crop',
    basePrice: 199900,
    priceUnit: 'per_visit',
    minDurationMinutes: 240,
    searchKeywords: ['deep clean', 'move in', 'shifting', 'गहरी सफाई'],
    sortOrder: 2,
  },
  {
    slug: 'pest-control',
    parentSlug: 'home-care',
    name: 'Pest Control',
    professionalTitle: 'TrustNear Pest Pro',
    shortPitch: 'Cockroach, termite, mosquito treatment',
    description:
      'Government-approved chemicals, child + pet safe. Includes 30-day touch-up guarantee.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1632863677807-846708d2e7f4?w=1200&q=80&auto=format&fit=crop',
    basePrice: 89900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: ['pest', 'cockroach', 'termite', 'मच्छर', 'कीड़े'],
    sortOrder: 3,
  },
  {
    slug: 'sanitization',
    parentSlug: 'home-care',
    name: 'Sanitization',
    professionalTitle: 'TrustNear Sanitize Pro',
    shortPitch: 'Hospital-grade disinfection',
    description:
      'Full-home sanitization with hospital-grade chemicals. Recommended monthly during flu season.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?w=1200&q=80&auto=format&fit=crop',
    basePrice: 129900,
    priceUnit: 'per_visit',
    minDurationMinutes: 120,
    searchKeywords: ['sanitize', 'disinfect', 'sanitization', 'covid'],
    sortOrder: 4,
  },

  // ─── Repairs ────────────────────────────────────────────────
  {
    slug: 'plumbing',
    parentSlug: 'repairs',
    name: 'Plumbing',
    professionalTitle: 'TrustNear Plumber',
    shortPitch: 'Leaks, taps, RO, geyser fixes',
    description: 'Licensed plumbers. Most fixes in one visit. Parts at MRP, no markup.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['plumber', 'pipe', 'leak', 'पाइप', 'नल'],
    sortOrder: 1,
  },
  {
    slug: 'electrical',
    parentSlug: 'repairs',
    name: 'Electrical',
    professionalTitle: 'TrustNear Electrician',
    shortPitch: 'Wiring, fans, inverter, switchboard',
    description:
      'Certified electricians for wiring repairs, fan installations, inverter setup, switchboard replacement.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['electrician', 'wiring', 'fan', 'बिजली', 'इलेक्ट्रिशियन'],
    sortOrder: 2,
  },
  {
    slug: 'ac-service',
    parentSlug: 'repairs',
    name: 'AC Service',
    professionalTitle: 'TrustNear AC Tech',
    shortPitch: 'Service, gas, installation',
    description:
      'AC service (jet wash + gas top-up), split / window installation, repair. Brand-agnostic.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1631545806609-2bcaff4ab7f4?w=1200&q=80&auto=format&fit=crop',
    basePrice: 59900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: ['ac', 'air conditioner', 'gas', 'cooling', 'एसी'],
    sortOrder: 3,
  },
  {
    slug: 'appliance-repair',
    parentSlug: 'repairs',
    name: 'Appliance Repair',
    professionalTitle: 'TrustNear Appliance Pro',
    shortPitch: 'Fridge, washing machine, microwave',
    description:
      'Diagnostic + repair for refrigerator, washing machine, microwave, mixer-grinder. 30-day warranty on repairs.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1545972154-9bb223aac798?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['fridge', 'washing machine', 'microwave', 'appliance', 'फ्रिज'],
    sortOrder: 4,
  },

  // ─── Beauty & Wellness ──────────────────────────────────────
  {
    slug: 'salon-women',
    parentSlug: 'beauty-wellness',
    name: 'Salon at Home (Women)',
    professionalTitle: 'TrustNear Beauty Pro',
    shortPitch: 'Waxing, threading, facials, pedicure',
    description:
      'Female therapists only. Sanitized single-use kits. Studio-grade products at home-service price.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop',
    basePrice: 79900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['salon', 'beauty', 'waxing', 'facial', 'पार्लर'],
    sortOrder: 1,
  },
  {
    slug: 'spa-massage',
    parentSlug: 'beauty-wellness',
    name: 'Spa & Massage',
    professionalTitle: 'TrustNear Spa Therapist',
    shortPitch: 'Deep tissue, relaxation, prenatal',
    description:
      'Certified therapists with own massage bed + oils. Specialised options: prenatal, sports recovery, lymphatic.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80&auto=format&fit=crop',
    basePrice: 149900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['spa', 'massage', 'therapist', 'मसाज'],
    sortOrder: 2,
  },
  {
    slug: 'hair-makeup',
    parentSlug: 'beauty-wellness',
    name: 'Hair & Makeup',
    professionalTitle: 'TrustNear Stylist',
    shortPitch: 'Bridal, party, photoshoot looks',
    description:
      'Senior stylists from top studios. Bridal packages start at ₹5,999. Trial sessions available.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=80&auto=format&fit=crop',
    basePrice: 249900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: ['makeup', 'hair', 'bridal', 'stylist', 'मेकअप'],
    sortOrder: 3,
  },
  {
    slug: 'mens-grooming',
    parentSlug: 'beauty-wellness',
    name: "Men's Grooming",
    professionalTitle: 'TrustNear Barber',
    shortPitch: 'Haircut, beard styling, facials',
    description:
      'Male grooming experts with full studio kit. Haircut, beard styling, head massage, facials.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_visit',
    minDurationMinutes: 45,
    searchKeywords: ['barber', 'mens', 'beard', 'haircut', 'दाढ़ी'],
    sortOrder: 4,
  },

  // ─── Lifestyle ─────────────────────────────────────────────
  {
    slug: 'fitness-trainer',
    parentSlug: 'lifestyle',
    name: 'Fitness Trainer',
    professionalTitle: 'TrustNear Fitness Coach',
    shortPitch: 'At-home personal training',
    description:
      'Certified trainers come with their own equipment. Strength, cardio, fat-loss, post-injury rehab.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&auto=format&fit=crop',
    basePrice: 79900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['fitness', 'trainer', 'gym', 'workout', 'जिम'],
    sortOrder: 1,
  },
  {
    slug: 'yoga',
    parentSlug: 'lifestyle',
    name: 'Yoga',
    professionalTitle: 'TrustNear Yoga Instructor',
    shortPitch: 'Hatha, vinyasa, prenatal',
    description:
      'Trained yoga instructors for one-on-one or family sessions. Beginner-friendly styles available.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80&auto=format&fit=crop',
    basePrice: 59900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['yoga', 'meditation', 'wellness', 'योग'],
    sortOrder: 2,
  },
  {
    slug: 'photography',
    parentSlug: 'lifestyle',
    name: 'Photography',
    professionalTitle: 'TrustNear Photographer',
    shortPitch: 'Baby, family, anniversary, events',
    description:
      'Portrait photographers for personal occasions. 60-min session + 20 edited photos in package.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1200&q=80&auto=format&fit=crop',
    basePrice: 299900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: ['photographer', 'baby shoot', 'family', 'फोटो'],
    sortOrder: 3,
  },
  {
    slug: 'tutor',
    parentSlug: 'lifestyle',
    name: 'Home Tutor',
    professionalTitle: 'TrustNear Tutor',
    shortPitch: 'K–12 school subjects, competitive prep',
    description:
      'Qualified subject tutors for K–12. Math, Science, Hindi, English. Competitive exam prep available.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop',
    basePrice: 49900,
    priceUnit: 'per_hour',
    minDurationMinutes: 60,
    searchKeywords: ['tutor', 'teacher', 'पढ़ाई', 'tuition'],
    sortOrder: 4,
  },
];

const appConfig = [
  {
    key: 'platform_commission_rate',
    value: { default: 15, premium_pro: 10 },
    description: 'Platform commission % by pro tier',
    isPublic: false,
  },
  {
    key: 'safety_fee_tiers',
    value: { standard: 1900, premium: 2900, emergency: 4900 },
    description: 'Safety fee added to every booking by tier',
    isPublic: true,
  },
  {
    key: 'trust_score_weights',
    value: {
      punctuality: 25,
      review: 25,
      repeat: 20,
      cancellation: 15,
      response: 10,
      profile: 5,
    },
    description: 'Trust Score factor weights (total = 100)',
    isPublic: false,
  },
  {
    key: 'gps_update_interval_seconds',
    value: 3,
    description: 'Pro app GPS broadcast interval',
    isPublic: false,
  },
  {
    key: 'otp_expiry_minutes',
    value: 10,
    description: 'Booking OTP TTL',
    isPublic: false,
  },
  {
    key: 'cancellation_penalty_minutes',
    value: 60,
    description: 'Customer cancellation penalty window',
    isPublic: true,
  },
  {
    key: 'max_booking_advance_days',
    value: 7,
    description: 'How far ahead customers can book',
    isPublic: true,
  },
  {
    key: 'referral_reward_amount',
    value: { referee: 10000, referrer: 15000 },
    description: 'Referral reward amounts',
    isPublic: true,
  },
  {
    key: 'active_cities',
    value: ['Jaipur'],
    description: 'Cities where TrustNear is live',
    isPublic: true,
  },
  {
    key: 'maintenance_mode',
    value: false,
    description: 'Force apps into maintenance mode',
    isPublic: true,
  },
  {
    key: 'featured_parent_categories',
    value: ['home-care', 'repairs', 'beauty-wellness', 'lifestyle'],
    description: 'Parent category order on customer home tab',
    isPublic: true,
  },
  {
    key: 'payment_provider',
    value: 'cashfree',
    description:
      'Active payment gateway. Change to switch live (cashfree/razorpay/stripe/mock). ' +
      'Credentials must already be in env for the new provider.',
    isPublic: false,
  },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding parent categories…');
  const parentBySlug = new Map<string, string>();
  for (const p of parents) {
    const row = await prisma.serviceCategory.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortPitch: p.shortPitch,
        description: p.description,
        heroImageUrl: p.heroImageUrl,
        sortOrder: p.sortOrder,
        isFeatured: true,
        basePrice: 0,
        isActive: true,
        parentId: null,
      },
      create: {
        slug: p.slug,
        name: p.name,
        shortPitch: p.shortPitch,
        description: p.description,
        heroImageUrl: p.heroImageUrl,
        sortOrder: p.sortOrder,
        isFeatured: true,
        basePrice: 0,
        searchKeywords: [],
      },
    });
    parentBySlug.set(p.slug, row.id);
    console.log(`  ✓ parent: ${p.name}`);
  }

  console.log('🌱 Seeding child categories…');
  for (const c of children) {
    const parentId = parentBySlug.get(c.parentSlug);
    if (!parentId) {
      console.warn(`  ⚠ missing parent ${c.parentSlug} for ${c.slug}`);
      continue;
    }
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: {
        parentId,
        name: c.name,
        professionalTitle: c.professionalTitle,
        shortPitch: c.shortPitch,
        description: c.description,
        heroImageUrl: c.heroImageUrl,
        basePrice: c.basePrice,
        priceUnit: c.priceUnit,
        minDurationMinutes: c.minDurationMinutes,
        searchKeywords: c.searchKeywords,
        sortOrder: c.sortOrder,
        isFeatured: true,
        isActive: true,
      },
      create: {
        parentId,
        slug: c.slug,
        name: c.name,
        professionalTitle: c.professionalTitle,
        shortPitch: c.shortPitch,
        description: c.description,
        heroImageUrl: c.heroImageUrl,
        basePrice: c.basePrice,
        priceUnit: c.priceUnit,
        minDurationMinutes: c.minDurationMinutes,
        searchKeywords: c.searchKeywords,
        sortOrder: c.sortOrder,
        isFeatured: true,
      },
    });
    console.log(`  ✓ child: ${c.parentSlug} → ${c.name}`);
  }

  // Deactivate any legacy slug that didn't make the new cut so old data
  // doesn't show up in the UI but bookings referencing it still resolve.
  const validSlugs = new Set([...parents.map((p) => p.slug), ...children.map((c) => c.slug)]);
  const all = await prisma.serviceCategory.findMany({ select: { id: true, slug: true } });
  for (const cat of all) {
    if (!validSlugs.has(cat.slug)) {
      await prisma.serviceCategory.update({
        where: { id: cat.id },
        data: { isActive: false, isFeatured: false },
      });
      console.log(`  ⊘ deactivated legacy: ${cat.slug}`);
    }
  }

  console.log('🌱 Seeding app_config…');
  for (const cfg of appConfig) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description, isPublic: cfg.isPublic },
      create: cfg,
    });
  }
  console.log(`✓ Seeded ${appConfig.length} config entries`);

  console.log('✅ Seed complete');
}

main()
  .catch((err: unknown) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
