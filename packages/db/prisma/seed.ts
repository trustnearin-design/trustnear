/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    slug: 'home-cleaning',
    name: 'Home Cleaning',
    professionalTitle: 'SevaCare Pro',
    description: 'Deep home cleaning by trained pros',
    basePrice: 39900, // ₹399 in paise
    priceUnit: 'per_hour' as const,
    isFeatured: true,
    sortOrder: 1,
    searchKeywords: ['cleaning', 'maid', 'safai', 'घर की सफाई'],
  },
  {
    slug: 'cooking',
    name: 'Cooking',
    professionalTitle: 'SevaChef',
    description: 'Home chefs for daily meals or special occasions',
    basePrice: 49900,
    priceUnit: 'per_visit' as const,
    isFeatured: true,
    sortOrder: 2,
    searchKeywords: ['cook', 'chef', 'खाना', 'रसोई'],
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    professionalTitle: 'SevaElite Tech',
    description: 'Licensed electricians for repairs and installations',
    basePrice: 29900,
    priceUnit: 'per_visit' as const,
    isFeatured: true,
    sortOrder: 3,
    searchKeywords: ['electrician', 'wiring', 'बिजली'],
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    professionalTitle: 'SevaPipe Pro',
    description: 'Skilled plumbers for leaks, installations, and repairs',
    basePrice: 29900,
    priceUnit: 'per_visit' as const,
    isFeatured: true,
    sortOrder: 4,
    searchKeywords: ['plumber', 'pipe', 'पाइप', 'नल'],
  },
  {
    slug: 'tutor',
    name: 'Home Tutor',
    professionalTitle: 'SevaGuide',
    description: 'Qualified tutors for school subjects (K–12)',
    basePrice: 49900,
    priceUnit: 'per_hour' as const,
    isFeatured: false,
    sortOrder: 5,
    searchKeywords: ['tutor', 'teacher', 'पढ़ाई'],
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
    value: { standard: 1900, premium: 2900, emergency: 4900 }, // paise
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
    value: { referee: 10000, referrer: 15000 }, // paise
    description: 'Referral reward amounts',
    isPublic: true,
  },
  {
    key: 'active_cities',
    value: ['Jaipur'],
    description: 'Cities where SEVALINK is live',
    isPublic: true,
  },
  {
    key: 'maintenance_mode',
    value: false,
    description: 'Force apps into maintenance mode',
    isPublic: true,
  },
  {
    key: 'featured_categories_home',
    value: ['home-cleaning', 'cooking', 'electrical', 'plumbing'],
    description: 'Categories shown on customer homepage',
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
  console.log('🌱 Seeding service categories…');
  for (const c of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }
  console.log(`✓ Seeded ${categories.length} categories`);

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
