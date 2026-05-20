/* eslint-disable no-console */
/**
 * Dev-only seed — adds sample professionals so discovery endpoints
 * have data to return locally. NEVER run in production.
 */
import { PrismaClient } from '@prisma/client';

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌ seed-dev refuses to run in production');
  process.exit(1);
}

const prisma = new PrismaClient();

// All coordinates around Jaipur (Vaishali Nagar, Malviya Nagar, C-Scheme, Jagatpura, Mansarovar)
const JAIPUR_PROS = [
  {
    phone: '+918001000001',
    fullName: 'Rohit Sharma',
    area: 'Vaishali Nagar',
    lat: 26.9124,
    lng: 75.7873,
    title: 'SevaChef Pro',
    bio: '7 years cooking experience — North Indian, Rajasthani specialty',
    yearsExperience: 7,
    trustScore: 87,
    trustBadge: 'gold' as const,
    repeatClientCount: 38,
    totalBookings: 142,
    categories: ['cooking'],
  },
  {
    phone: '+918001000002',
    fullName: 'Priya Yadav',
    area: 'Malviya Nagar',
    lat: 26.8467,
    lng: 75.8123,
    title: 'SevaCare Pro',
    bio: 'Deep cleaning specialist, kitchen + bathroom expert',
    yearsExperience: 4,
    trustScore: 76,
    trustBadge: 'silver' as const,
    repeatClientCount: 22,
    totalBookings: 89,
    categories: ['home-cleaning'],
  },
  {
    phone: '+918001000003',
    fullName: 'Amit Kumar',
    area: 'C-Scheme',
    lat: 26.9097,
    lng: 75.8005,
    title: 'SevaElite Tech',
    bio: 'Licensed electrician — wiring, fans, inverter, AC installation',
    yearsExperience: 12,
    trustScore: 92,
    trustBadge: 'platinum' as const,
    repeatClientCount: 67,
    totalBookings: 234,
    categories: ['electrical'],
  },
  {
    phone: '+918001000004',
    fullName: 'Suresh Meena',
    area: 'Jagatpura',
    lat: 26.829,
    lng: 75.85,
    title: 'SevaPipe Pro',
    bio: 'Plumbing repairs, water tank, RO, geyser installation',
    yearsExperience: 9,
    trustScore: 81,
    trustBadge: 'gold' as const,
    repeatClientCount: 31,
    totalBookings: 118,
    categories: ['plumbing'],
  },
  {
    phone: '+918001000005',
    fullName: 'Neha Gupta',
    area: 'Mansarovar',
    lat: 26.852,
    lng: 75.76,
    title: 'SevaChef',
    bio: 'Vegetarian home chef, Gujarati + Marwari thali specialist',
    yearsExperience: 5,
    trustScore: 68,
    trustBadge: 'silver' as const,
    repeatClientCount: 14,
    totalBookings: 52,
    categories: ['cooking', 'home-cleaning'],
  },
];

async function main(): Promise<void> {
  // Lookup category ids by slug
  const cats = await prisma.serviceCategory.findMany();
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  for (const p of JAIPUR_PROS) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: {
        fullName: p.fullName,
        latitude: p.lat,
        longitude: p.lng,
        area: p.area,
        isActive: true,
        isVerified: true,
      },
      create: {
        phone: p.phone,
        fullName: p.fullName,
        role: 'professional',
        city: 'Jaipur',
        area: p.area,
        latitude: p.lat,
        longitude: p.lng,
        isVerified: true,
        referralCode: `DEV${p.phone.slice(-6)}`,
      },
    });

    const pro = await prisma.professional.upsert({
      where: { userId: user.id },
      update: {
        professionalTitle: p.title,
        bio: p.bio,
        yearsExperience: p.yearsExperience,
        trustScore: p.trustScore,
        trustBadge: p.trustBadge,
        availabilityStatus: 'online',
        aadhaarVerified: true,
        faceVerified: true,
        repeatClientCount: p.repeatClientCount,
        totalBookings: p.totalBookings,
        avgResponseTimeSeconds: 45 + Math.floor(Math.random() * 60),
      },
      create: {
        userId: user.id,
        professionalTitle: p.title,
        bio: p.bio,
        yearsExperience: p.yearsExperience,
        trustScore: p.trustScore,
        trustBadge: p.trustBadge,
        availabilityStatus: 'online',
        aadhaarVerified: true,
        faceVerified: true,
        repeatClientCount: p.repeatClientCount,
        totalBookings: p.totalBookings,
        avgResponseTimeSeconds: 45 + Math.floor(Math.random() * 60),
      },
    });

    // Real-time location row
    await prisma.proLocation.upsert({
      where: { professionalId: pro.id },
      update: { latitude: p.lat, longitude: p.lng },
      create: { professionalId: pro.id, latitude: p.lat, longitude: p.lng },
    });

    // Service offerings
    for (const slug of p.categories) {
      const cat = catBySlug.get(slug);
      if (!cat) continue;
      await prisma.proServiceOffering.upsert({
        where: {
          professionalId_categoryId: { professionalId: pro.id, categoryId: cat.id },
        },
        update: { isActive: true, experienceYears: p.yearsExperience },
        create: {
          professionalId: pro.id,
          categoryId: cat.id,
          experienceYears: p.yearsExperience,
          isActive: true,
        },
      });
    }

    // Mon-Sat 9am-8pm schedule
    for (let day = 1; day <= 6; day++) {
      await prisma.proSchedule.upsert({
        where: { professionalId_dayOfWeek: { professionalId: pro.id, dayOfWeek: day } },
        update: { startTime: '09:00', endTime: '20:00', isAvailable: true },
        create: {
          professionalId: pro.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '20:00',
          isAvailable: true,
        },
      });
    }

    console.log(`  ✓ ${p.title} ${p.fullName} (${p.area})`);
  }

  console.log(`✅ Seeded ${JAIPUR_PROS.length} sample pros`);
}

main()
  .catch((err: unknown) => {
    console.error('❌ Dev seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
