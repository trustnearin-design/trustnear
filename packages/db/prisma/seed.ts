/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * TrustNear category hierarchy — 10 parents × ~3-5 children each (~35 leaves).
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
    name: 'Home Cleaning',
    shortPitch: 'Deep clean, sofa, water tank, sewage & more',
    description:
      'Trained pros with own kit — weekly cleaning to specialised water tank / sewage / sofa jobs.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 1,
  },
  {
    slug: 'appliances',
    name: 'Appliance Repair',
    shortPitch: 'AC, chimney, RO, gas stove, geyser, fridge fixes',
    description:
      'Same-day appliance technicians. Brand-agnostic, 30-day warranty on repairs, transparent parts pricing.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1545972154-9bb223aac798?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 2,
  },
  {
    slug: 'repairs',
    name: 'Home Repair',
    shortPitch: 'Plumber, electrician, carpenter, painter, mochi',
    description:
      'Licensed and police-verified technicians for everything that needs fixing — same-day visits for urgent issues.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 3,
  },
  {
    slug: 'beauty-wellness',
    name: 'Salon & Beauty',
    shortPitch: 'Salon, spa, mehndi, hair & makeup at your home',
    description:
      'Studio-grade salon and spa services in the comfort of your home. Trained therapists, sanitized tools, fixed prices.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 4,
  },
  {
    slug: 'daily-help',
    name: 'Daily Help',
    shortPitch: 'Maid, cook, office boy, construction worker — hourly',
    description:
      'Hourly-rate verified helpers for everyday tasks. Pay by the hour, cancel anytime, trusted faces.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 5,
  },
  {
    slug: 'care-services',
    name: 'Care Services',
    shortPitch: 'Nurse, elder care, child care, home tutor',
    description:
      'Background-verified caregivers for your loved ones — short-term or long-term, with full identity + reference checks.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 6,
  },
  {
    slug: 'pet-care',
    name: 'Pet Care',
    shortPitch: 'Dog grooming, walking & pet sitting',
    description:
      'Certified pet handlers. Dog grooming at home with own kit, dog walking by the hour, vacation pet sitting.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 7,
  },
  {
    slug: 'vehicle-driver',
    name: 'Vehicle & Driver',
    shortPitch: 'Car wash, bike wash, house-based driver',
    description:
      'On-demand car & bike washing at your doorstep, plus background-verified house drivers (full-day or hourly).',
    heroImageUrl:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 8,
  },
  {
    slug: 'outdoor',
    name: 'Outdoor & Misc',
    shortPitch: 'Gardener, laundry pickup, festive helpers',
    description:
      'Garden maintenance, laundry pickup & delivery, mehndi artists and special-occasion help.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 9,
  },
  {
    slug: 'lifestyle',
    name: 'Fitness & Tutors',
    shortPitch: 'Trainers, yoga, photography, school tutors',
    description:
      'Find vetted fitness coaches, yoga instructors, school tutors and photographers — all background-checked, all near you.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&auto=format&fit=crop',
    sortOrder: 10,
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
    searchKeywords: [
      'cleaning',
      'maid',
      'safai',
      'घर की सफाई',
      'cleaner',
      'jhadu pocha',
      'bartan',
      'bai',
      'kaamwali',
      'ghar saaf',
      'sweeping',
      'mopping',
      'dusting',
      'झाड़ू पोछा',
    ],
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
    searchKeywords: [
      'deep clean',
      'move in',
      'move out',
      'shifting',
      'गहरी सफाई',
      'spring clean',
      'full house cleaning',
      'diwali cleaning',
      'festival cleaning',
      'deep cleaning',
    ],
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
      'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?w=1200&q=80&auto=format&fit=crop',
    basePrice: 89900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'pest',
      'pest control',
      'cockroach',
      'cockroach spray',
      'termite',
      'मच्छर',
      'कीड़े',
      'lizard',
      'chipkali',
      'keede',
      'khatmal',
      'machhar',
      'bed bugs',
      'ants',
      'fumigation',
      'दीमक',
      'rat',
      'mouse',
      'mice',
      'chuha',
      'chuhe',
      'rodent',
      'चूहा',
    ],
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
    searchKeywords: [
      'sanitize',
      'disinfect',
      'disinfection',
      'sanitization',
      'covid',
      'fogging',
      'germ',
      'virus',
      'sanitisation',
    ],
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
    searchKeywords: [
      'plumber',
      'plumbing',
      'pipe',
      'leak',
      'leakage',
      'पाइप',
      'नल',
      'tap',
      'faucet',
      'drainage',
      'blockage',
      'water leak',
      'tap repair',
      'toti',
    ],
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
    searchKeywords: [
      'electrician',
      'electrical',
      'wiring',
      'fan',
      'बिजली',
      'इलेक्ट्रिशियन',
      'switch',
      'switchboard',
      'inverter',
      'mcb',
      'light',
      'short circuit',
      'fan installation',
    ],
    sortOrder: 2,
  },
  {
    slug: 'carpenter',
    parentSlug: 'repairs',
    name: 'Carpenter',
    professionalTitle: 'TrustNear Carpenter',
    shortPitch: 'Furniture repair, door, modular kitchen',
    description:
      'Skilled carpenters for door fitting, modular kitchen, custom furniture, drawer + hinge repair.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'carpenter',
      'furniture',
      'door',
      'बढ़ई',
      'kitchen',
      'wood',
      'almirah',
      'bed repair',
      'table',
      'hinge',
      'drawer',
      'modular kitchen',
      'lakdi',
      'fabrication',
    ],
    sortOrder: 3,
  },
  {
    slug: 'painter',
    parentSlug: 'repairs',
    name: 'Painter',
    professionalTitle: 'TrustNear Painter',
    shortPitch: 'Room, full home, texture & putty work',
    description:
      'Professional painters for single rooms or whole homes. Putty + primer + 2-coat paint with material at MRP.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&q=80&auto=format&fit=crop',
    basePrice: 49900,
    priceUnit: 'per_visit',
    minDurationMinutes: 240,
    searchKeywords: [
      'painter',
      'paint',
      'painting',
      'wall',
      'पेंटर',
      'putty',
      'whitewash',
      'primer',
      'texture',
      'distemper',
      'wall paint',
      'putai',
      'rangai',
    ],
    sortOrder: 4,
  },
  {
    slug: 'mochi',
    parentSlug: 'repairs',
    name: 'Mochi (Cobbler)',
    professionalTitle: 'TrustNear Cobbler',
    shortPitch: 'Shoe repair, polish, sole change at home',
    description:
      'Skilled cobblers visit your home with their kit — sole replacement, stitching, polish, heel repair, zip fix.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=1200&q=80&auto=format&fit=crop',
    basePrice: 14900,
    priceUnit: 'per_visit',
    minDurationMinutes: 30,
    searchKeywords: [
      'mochi',
      'cobbler',
      'shoe',
      'मोची',
      'polish',
      'shoe repair',
      'sole change',
      'heel',
      'sandal repair',
      'jutta',
      'zip repair',
      'leather repair',
    ],
    sortOrder: 5,
  },
  // ─── Appliance Repair ──────────────────────────────────────
  {
    slug: 'ac-service',
    parentSlug: 'appliances',
    name: 'AC Repair & Service',
    professionalTitle: 'TrustNear AC Tech',
    shortPitch: 'Service, gas top-up, installation',
    description:
      'AC service (jet wash + gas top-up), split / window installation, repair. Brand-agnostic.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1545972154-9bb223aac798?w=1200&q=80&auto=format&fit=crop',
    basePrice: 59900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'ac',
      'air conditioner',
      'gas',
      'cooling',
      'एसी',
      'ac repair',
      'ac service',
      'gas refill',
      'split ac',
      'window ac',
      'ac not cooling',
      'ac installation',
      'ac gas',
    ],
    sortOrder: 1,
  },
  {
    slug: 'chimney-repair',
    parentSlug: 'appliances',
    name: 'Chimney Repair',
    professionalTitle: 'TrustNear Chimney Tech',
    shortPitch: 'Deep clean, motor, filter, suction fix',
    description:
      'Chimney degreasing, motor replacement, baffle filter cleaning, suction restoration. All brands.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=1200&q=80&auto=format&fit=crop',
    basePrice: 69900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'chimney',
      'kitchen',
      'चिमनी',
      'hood',
      'chimney cleaning',
      'chimney service',
      'kitchen chimney',
      'exhaust',
      'suction',
      'chimney repair',
    ],
    sortOrder: 2,
  },
  {
    slug: 'ro-repair',
    parentSlug: 'appliances',
    name: 'RO / Water Purifier',
    professionalTitle: 'TrustNear RO Tech',
    shortPitch: 'Filter change, leakage, AMC',
    description:
      'RO service and repair — filter replacement, membrane change, leakage fix, AMC plans available.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_visit',
    minDurationMinutes: 45,
    searchKeywords: [
      'ro',
      'water purifier',
      'filter',
      'पानी',
      'ro service',
      'ro repair',
      'kent',
      'aquaguard',
      'water filter',
      'membrane',
      'filter change',
      'पानी फिल्टर',
    ],
    sortOrder: 3,
  },
  {
    slug: 'gas-stove-repair',
    parentSlug: 'appliances',
    name: 'Gas Stove Repair',
    professionalTitle: 'TrustNear Gas Tech',
    shortPitch: 'Burner, ignition, leakage fix',
    description:
      'Gas stove repair, burner cleaning, auto-ignition fix, leak test, regulator change.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_visit',
    minDurationMinutes: 45,
    searchKeywords: [
      'gas',
      'stove',
      'चूल्हा',
      'burner',
      'gas stove',
      'gas chulha',
      'burner repair',
      'ignition',
      'gas leak',
      'regulator',
      'stove repair',
      'gas stove repair',
    ],
    sortOrder: 4,
  },
  {
    slug: 'geyser-repair',
    parentSlug: 'appliances',
    name: 'Geyser Repair',
    professionalTitle: 'TrustNear Geyser Tech',
    shortPitch: 'Element, thermostat, installation',
    description: 'Geyser repair — heating element, thermostat, leakage, installation, descaling.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80&auto=format&fit=crop',
    basePrice: 34900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: [
      'geyser',
      'water heater',
      'गीजर',
      'geyser repair',
      'geyser service',
      'heating element',
      'thermostat',
      'geyser installation',
      'water heater repair',
    ],
    sortOrder: 5,
  },
  {
    slug: 'appliance-repair',
    parentSlug: 'appliances',
    name: 'Fridge & Washing Machine',
    professionalTitle: 'TrustNear Appliance Pro',
    shortPitch: 'Fridge, washing machine, microwave',
    description:
      'Diagnostic + repair for refrigerator, washing machine, microwave, mixer-grinder. 30-day warranty on repairs.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1545972154-9bb223aac798?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: [
      'fridge',
      'washing machine',
      'microwave',
      'appliance',
      'फ्रिज',
      'refrigerator',
      'washing machine repair',
      'microwave repair',
      'mixer grinder',
      'oven',
      'dishwasher',
      'fridge repair',
      'वॉशिंग मशीन',
    ],
    sortOrder: 6,
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
    searchKeywords: [
      'salon',
      'beauty',
      'waxing',
      'facial',
      'पार्लर',
      'parlour',
      'threading',
      'pedicure',
      'manicure',
      'salon at home',
      'eyebrows',
      'ladies salon',
      'beautician',
      'cleanup',
    ],
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
    searchKeywords: [
      'spa',
      'massage',
      'therapist',
      'मसाज',
      'body massage',
      'full body massage',
      'deep tissue',
      'relaxation',
      'malish',
      'head massage',
      'spa at home',
    ],
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
    searchKeywords: [
      'makeup',
      'hair',
      'bridal',
      'stylist',
      'मेकअप',
      'bridal makeup',
      'party makeup',
      'hair styling',
      'hair color',
      'dulhan makeup',
      'photoshoot makeup',
      'makeup artist',
    ],
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
    searchKeywords: [
      'barber',
      'mens',
      'beard',
      'haircut',
      'दाढ़ी',
      'men salon',
      'mens haircut',
      'beard trim',
      'shave',
      'naai',
      'hajaam',
      'men grooming',
      'baal katna',
    ],
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
    searchKeywords: [
      'fitness',
      'trainer',
      'gym',
      'workout',
      'जिम',
      'personal trainer',
      'fitness coach',
      'weight loss',
      'exercise',
      'home workout',
      'gym trainer',
    ],
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
    searchKeywords: [
      'yoga',
      'meditation',
      'wellness',
      'योग',
      'yoga teacher',
      'yoga instructor',
      'pranayama',
      'yoga at home',
      'dhyan',
      'asana',
    ],
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
    searchKeywords: [
      'photography',
      'baby shoot',
      'family',
      'फोटो',
      'photographer',
      'photoshoot',
      'pre wedding',
      'birthday shoot',
      'event photography',
      'videographer',
    ],
    sortOrder: 3,
  },
  {
    slug: 'tutor',
    parentSlug: 'care-services',
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
    searchKeywords: [
      'tutor',
      'teacher',
      'पढ़ाई',
      'tuition',
      'home tutor',
      'tuition teacher',
      'maths tutor',
      'science tutor',
      'padhai',
      'coaching',
      'home tuition',
      'ट्यूशन',
    ],
    sortOrder: 4,
  },

  // ─── Salon & Beauty — Mehndi addition ───────────────────────
  {
    slug: 'mehndi-artist',
    parentSlug: 'beauty-wellness',
    name: 'Mehndi Artist',
    professionalTitle: 'TrustNear Mehndi Artist',
    shortPitch: 'Bridal, party, festival henna designs',
    description:
      'Skilled mehndi artists for weddings, karwa chauth, festivals. Arabic, bridal full-hand, custom designs.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1200&q=80&auto=format&fit=crop',
    basePrice: 89900,
    priceUnit: 'per_visit',
    minDurationMinutes: 120,
    searchKeywords: [
      'mehndi',
      'henna',
      'मेहंदी',
      'bridal',
      'mehndi artist',
      'bridal mehndi',
      'arabic mehndi',
      'karwa chauth',
      'wedding mehndi',
      'mehandi',
    ],
    sortOrder: 5,
  },

  // ─── Home Care additions — sofa, water tank, sewage ─────────
  {
    slug: 'sofa-carpet-cleaning',
    parentSlug: 'home-care',
    name: 'Sofa & Carpet Cleaning',
    professionalTitle: 'TrustNear Cleaning Pro',
    shortPitch: 'Foam-jet sofa, carpet shampoo at home',
    description:
      'Deep foam-jet cleaning for sofa, carpet, mattress. Stain treatment + sanitization included.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=80&auto=format&fit=crop',
    basePrice: 49900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'sofa',
      'carpet',
      'cleaning',
      'foam',
      'सोफा',
      'sofa cleaning',
      'carpet cleaning',
      'mattress cleaning',
      'sofa shampoo',
      'gaddi cleaning',
      'कारपेट',
    ],
    sortOrder: 5,
  },
  {
    slug: 'water-tank-cleaning',
    parentSlug: 'home-care',
    name: 'Water Tank Cleaning',
    professionalTitle: 'TrustNear Tank Cleaner',
    shortPitch: 'Underground + overhead tank scrub',
    description:
      'Mechanical scrubbing + chlorine disinfection for underground and overhead water tanks. Photos before / after.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1532635241-17e820acc59f?w=1200&q=80&auto=format&fit=crop',
    basePrice: 79900,
    priceUnit: 'per_visit',
    minDurationMinutes: 120,
    searchKeywords: [
      'water tank',
      'tank cleaning',
      'टंकी',
      'water tank cleaning',
      'overhead tank',
      'underground tank',
      'tanki cleaning',
      'pani ki tanki',
      'tanki',
    ],
    sortOrder: 6,
  },
  {
    slug: 'sewage-cleaning',
    parentSlug: 'home-care',
    name: 'Sewage / Septic Cleaning',
    professionalTitle: 'TrustNear Sewage Pro',
    shortPitch: 'Septic tank pump-out, drain unblocking',
    description:
      'Septic tank pump-out with municipal-approved vehicle, drain unblocking, manhole cleaning.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1565843708714-52ecf69ab81f?w=1200&q=80&auto=format&fit=crop',
    basePrice: 149900,
    priceUnit: 'per_visit',
    minDurationMinutes: 120,
    searchKeywords: [
      'sewage',
      'septic',
      'drain',
      'सीवेज',
      'septic tank',
      'drain cleaning',
      'sewer',
      'manhole',
      'drain blockage',
      'naali',
      'gutter cleaning',
    ],
    sortOrder: 7,
  },

  // ─── Daily Help (hourly) ────────────────────────────────────
  {
    slug: 'maid-hourly',
    parentSlug: 'daily-help',
    name: 'Maid (Hourly)',
    professionalTitle: 'TrustNear Maid',
    shortPitch: 'Cleaning, mopping, utensils — per hour',
    description:
      'Trusted maids on hourly rate for everyday cleaning, mopping, utensil washing, laundry sorting.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&auto=format&fit=crop',
    basePrice: 19900,
    priceUnit: 'per_hour',
    minDurationMinutes: 60,
    searchKeywords: [
      'maid',
      'cleaner',
      'मेड',
      'hourly',
      'bai',
      'kaamwali bai',
      'house help',
      'naukrani',
      'ghar ka kaam',
      'utensils',
      'jhadu pocha',
      'bartan',
      'kaamwali',
    ],
    sortOrder: 1,
  },
  {
    slug: 'bathroom-cleaner-hourly',
    parentSlug: 'daily-help',
    name: 'Bathroom Cleaner (Hourly)',
    professionalTitle: 'TrustNear Bathroom Pro',
    shortPitch: 'Daily bathroom scrub specialist',
    description:
      'Dedicated bathroom cleaning specialists — hard water stain removal, sanitization, daily refresh.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80&auto=format&fit=crop',
    basePrice: 24900,
    priceUnit: 'per_hour',
    minDurationMinutes: 60,
    searchKeywords: [
      'bathroom',
      'toilet',
      'cleaner',
      'बाथरूम',
      'bathroom cleaning',
      'toilet cleaning',
      'washroom',
      'bathroom scrub',
      'टॉयलेट',
    ],
    sortOrder: 2,
  },
  {
    slug: 'cook-hourly',
    parentSlug: 'daily-help',
    name: 'Cook (Hourly)',
    professionalTitle: 'TrustNear Cook',
    shortPitch: 'Daily home-cooked meals',
    description:
      'Background-verified home cooks. North Indian, South Indian, Gujarati, Punjabi cuisines available.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_hour',
    minDurationMinutes: 60,
    searchKeywords: [
      'cook',
      'maharaj',
      'खाना',
      'meals',
      'rasoiya',
      'home cook',
      'khana banane wali',
      'bawarchi',
      'tiffin',
      'daily cook',
      'khana banana',
    ],
    sortOrder: 3,
  },
  {
    slug: 'office-boy-hourly',
    parentSlug: 'daily-help',
    name: 'Office Boy (Hourly)',
    professionalTitle: 'TrustNear Office Helper',
    shortPitch: 'Office errands, tea, courier — per hour',
    description:
      'Reliable office helpers for tea/coffee service, errands, courier drops, document filing, light cleaning.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80&auto=format&fit=crop',
    basePrice: 19900,
    priceUnit: 'per_hour',
    minDurationMinutes: 240,
    searchKeywords: [
      'office boy',
      'peon',
      'helper',
      'चपरासी',
      'office helper',
      'errand boy',
      'chaprasi',
      'attendant',
      'office assistant',
    ],
    sortOrder: 4,
  },
  {
    slug: 'construction-worker-hourly',
    parentSlug: 'daily-help',
    name: 'Construction Helper (Hourly)',
    professionalTitle: 'TrustNear Construction Helper',
    shortPitch: 'Unskilled labour for moving, demolition',
    description:
      'Daily-wage construction helpers for moving heavy items, demolition cleanup, material loading.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop',
    basePrice: 17900,
    priceUnit: 'per_hour',
    minDurationMinutes: 480,
    searchKeywords: [
      'labour',
      'mazdoor',
      'मजदूर',
      'construction',
      'daily wage',
      'beldar',
      'construction worker',
      'loading',
      'shifting help',
      'labor',
    ],
    sortOrder: 5,
  },

  // ─── Care Services ─────────────────────────────────────────
  {
    slug: 'nurse-hourly',
    parentSlug: 'care-services',
    name: 'Nurse (Hourly)',
    professionalTitle: 'TrustNear Nurse',
    shortPitch: 'Trained nursing at home',
    description:
      'GNM / ANM qualified nurses for post-surgery care, injections, IV setup, dressing, vitals monitoring.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80&auto=format&fit=crop',
    basePrice: 59900,
    priceUnit: 'per_hour',
    minDurationMinutes: 240,
    searchKeywords: [
      'nurse',
      'medical',
      'नर्स',
      'care',
      'nurse at home',
      'home nurse',
      'injection',
      'patient care',
      'dressing',
      'medical care',
      'home attendant',
    ],
    sortOrder: 1,
  },
  {
    slug: 'elder-care',
    parentSlug: 'care-services',
    name: 'Elder Care',
    professionalTitle: 'TrustNear Elder Caretaker',
    shortPitch: 'Companion + assistance for parents',
    description:
      'Trained attendants for senior citizens — medication reminders, mobility assistance, doctor visits, companionship.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_hour',
    minDurationMinutes: 480,
    searchKeywords: [
      'elder',
      'senior',
      'parents',
      'बुजुर्ग',
      'caretaker',
      'elder care',
      'old age care',
      'senior citizen',
      'parents care',
      'companion',
      'bedridden care',
    ],
    sortOrder: 2,
  },
  {
    slug: 'child-care',
    parentSlug: 'care-services',
    name: 'Child Care / Nanny',
    professionalTitle: 'TrustNear Nanny',
    shortPitch: 'Trusted nannies for kids',
    description:
      'Background-verified nannies for toddler care, school pickup, homework supervision, meal feeding.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=1200&q=80&auto=format&fit=crop',
    basePrice: 39900,
    priceUnit: 'per_hour',
    minDurationMinutes: 240,
    searchKeywords: [
      'nanny',
      'child',
      'kid',
      'बच्चे',
      'babysitter',
      'child care',
      'baby care',
      'ayah',
      'baby sitter',
      'bachche ki dekhbhal',
      'baby',
    ],
    sortOrder: 3,
  },

  // ─── Pet Care ──────────────────────────────────────────────
  {
    slug: 'dog-grooming',
    parentSlug: 'pet-care',
    name: 'Dog Grooming',
    professionalTitle: 'TrustNear Pet Groomer',
    shortPitch: 'Bath, haircut, nail trim at home',
    description:
      'Certified pet groomers visit your home with hydraulic table, scissors, shampoo. All breeds.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80&auto=format&fit=crop',
    basePrice: 89900,
    priceUnit: 'per_visit',
    minDurationMinutes: 90,
    searchKeywords: [
      'dog',
      'pet',
      'grooming',
      'कुत्ता',
      'dog grooming',
      'pet grooming',
      'dog bath',
      'dog haircut',
      'pet bath',
      'dog spa',
      'pet care',
    ],
    sortOrder: 1,
  },
  {
    slug: 'dog-walking',
    parentSlug: 'pet-care',
    name: 'Dog Walking',
    professionalTitle: 'TrustNear Dog Walker',
    shortPitch: 'Daily walks, hourly visits',
    description:
      'Reliable dog walkers — daily 30-min or 60-min walks, weekend boarding, vacation pet sitting.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80&auto=format&fit=crop',
    basePrice: 19900,
    priceUnit: 'per_visit',
    minDurationMinutes: 30,
    searchKeywords: [
      'dog walker',
      'pet walking',
      'walk',
      'dog walking',
      'pet sitting',
      'pet boarding',
      'dog care',
      'pet walker',
    ],
    sortOrder: 2,
  },

  // ─── Vehicle & Driver ──────────────────────────────────────
  {
    slug: 'car-wash',
    parentSlug: 'vehicle-driver',
    name: 'Car Wash at Home',
    professionalTitle: 'TrustNear Car Cleaner',
    shortPitch: 'Foam + interior + waxing',
    description:
      'Doorstep car wash — foam wash, interior vacuum, dashboard polish, tyre shine, optional waxing.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_visit',
    minDurationMinutes: 60,
    searchKeywords: [
      'car wash',
      'detail',
      'गाड़ी',
      'cleaning',
      'car cleaning',
      'car detailing',
      'gaadi dhulai',
      'car wash at home',
      'car polish',
      'car interior cleaning',
    ],
    sortOrder: 1,
  },
  {
    slug: 'bike-wash',
    parentSlug: 'vehicle-driver',
    name: 'Bike Wash at Home',
    professionalTitle: 'TrustNear Bike Cleaner',
    shortPitch: 'Full body + chain clean',
    description: 'Bike washing at your doorstep — chain degreasing, body shampoo, polishing.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80&auto=format&fit=crop',
    basePrice: 14900,
    priceUnit: 'per_visit',
    minDurationMinutes: 45,
    searchKeywords: [
      'bike wash',
      'motorcycle',
      'बाइक',
      'bike cleaning',
      'bike wash at home',
      'scooter wash',
      'two wheeler wash',
      'bike polish',
    ],
    sortOrder: 2,
  },
  {
    slug: 'house-driver',
    parentSlug: 'vehicle-driver',
    name: 'House Driver',
    professionalTitle: 'TrustNear Driver',
    shortPitch: 'Verified drivers — hourly or full day',
    description:
      'Background-verified drivers — hourly trips, full-day events, monthly contracts. All licences verified.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=crop',
    basePrice: 24900,
    priceUnit: 'per_hour',
    minDurationMinutes: 240,
    searchKeywords: [
      'driver',
      'chauffeur',
      'ड्राइवर',
      'car driver',
      'house driver',
      'personal driver',
      'daily driver',
      'driver on hire',
    ],
    sortOrder: 3,
  },

  // ─── Outdoor & Misc ────────────────────────────────────────
  {
    slug: 'gardener',
    parentSlug: 'outdoor',
    name: 'Gardener',
    professionalTitle: 'TrustNear Gardener',
    shortPitch: 'Pruning, lawn, plant care',
    description:
      'Skilled gardeners for lawn mowing, plant pruning, fertilizing, kitchen-garden setup.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop',
    basePrice: 29900,
    priceUnit: 'per_visit',
    minDurationMinutes: 120,
    searchKeywords: [
      'gardener',
      'plants',
      'lawn',
      'माली',
      'mali',
      'gardening',
      'lawn mowing',
      'plant care',
      'garden maintenance',
      'bagwani',
      'pruning',
    ],
    sortOrder: 1,
  },
  {
    slug: 'laundry-pickup',
    parentSlug: 'outdoor',
    name: 'Laundry Pickup',
    professionalTitle: 'TrustNear Laundry',
    shortPitch: 'Wash + iron, doorstep pickup',
    description: 'Doorstep laundry pickup — wash, dry-clean, ironing. 48-hour return guaranteed.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1200&q=80&auto=format&fit=crop',
    basePrice: 14900,
    priceUnit: 'per_visit',
    minDurationMinutes: 30,
    searchKeywords: [
      'laundry',
      'wash',
      'iron',
      'कपड़े',
      'dry clean',
      'kapde dhona',
      'dhobi',
      'ironing',
      'press',
      'wash and iron',
      'istri',
      'dry cleaning',
      'kapde press',
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// EXPERTS (dummy professionals across Jaipur localities)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 30 dummy professionals spread across 5 Jaipur localities so that the
 * customer "nearby" radius query returns a believable, mixed-quality set
 * of options for any category. Coordinates are anchored to each locality
 * center with a small index-derived jitter so pros don't stack on one
 * pixel on the map.
 *
 * Phone numbers are reserved in the +91 98765 00001-30 block so they
 * never collide with real customer test numbers.
 */

const localities = {
  'vaishali-nagar': { name: 'Vaishali Nagar', lat: 26.918, lng: 75.732 },
  mansarovar: { name: 'Mansarovar', lat: 26.851, lng: 75.77 },
  'malviya-nagar': { name: 'Malviya Nagar', lat: 26.854, lng: 75.822 },
  'c-scheme': { name: 'C-Scheme', lat: 26.917, lng: 75.799 },
  jagatpura: { name: 'Jagatpura', lat: 26.842, lng: 75.853 },
} as const;

type LocalityKey = keyof typeof localities;
type TrustBadge = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

interface ExpertSeed {
  phone: string;
  fullName: string;
  profilePhoto: string;
  locality: LocalityKey;
  professionalTitle: string;
  bio: string;
  yearsExperience: number;
  trustBadge: TrustBadge;
  trustScore: number;
  totalBookings: number;
  repeatClientCount: number;
  avgResponseTimeSeconds: number;
  kyc: { aadhaar: boolean; face: boolean; bank: boolean; police: boolean };
  categorySlugs: string[];
}

// Stock portraits — Pravatar gives stable face per `u=` key, no auth needed.
function avatar(seed: string): string {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(seed)}`;
}

const FULL_KYC = { aadhaar: true, face: true, bank: true, police: true };
const PARTIAL_KYC = { aadhaar: true, face: true, bank: true, police: false };
const BASIC_KYC = { aadhaar: true, face: true, bank: false, police: false };

const experts: ExpertSeed[] = [
  // ─── Vaishali Nagar ─────────────────────────────────────────
  {
    phone: '+919876500001',
    fullName: 'Rohit Sharma',
    profilePhoto: avatar('rohit-sharma'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Cleaning Pro',
    bio: '5 years cleaning Vaishali Nagar homes. Brings full kit, leaves no streaks.',
    yearsExperience: 5,
    trustBadge: 'gold',
    trustScore: 87,
    totalBookings: 412,
    repeatClientCount: 38,
    avgResponseTimeSeconds: 45,
    kyc: FULL_KYC,
    categorySlugs: ['home-cleaning', 'deep-clean'],
  },
  {
    phone: '+919876500002',
    fullName: 'Priya Sharma',
    profilePhoto: avatar('priya-sharma'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Beauty Pro',
    bio: '8 years salon experience, trained at Lakmé Academy. Specialises in bridal makeup.',
    yearsExperience: 8,
    trustBadge: 'platinum',
    trustScore: 94,
    totalBookings: 681,
    repeatClientCount: 72,
    avgResponseTimeSeconds: 28,
    kyc: FULL_KYC,
    categorySlugs: ['salon-women'],
  },
  {
    phone: '+919876500003',
    fullName: 'Vikram Singh',
    profilePhoto: avatar('vikram-singh'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Plumber',
    bio: 'Licensed plumber. Quick fixes, transparent pricing, carries spare parts.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 78,
    totalBookings: 256,
    repeatClientCount: 21,
    avgResponseTimeSeconds: 62,
    kyc: PARTIAL_KYC,
    categorySlugs: ['plumbing'],
  },
  {
    phone: '+919876500004',
    fullName: 'Anjali Devi',
    profilePhoto: avatar('anjali-devi'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Yoga Instructor',
    bio: 'Certified Iyengar yoga teacher. Group + private sessions, all levels welcome.',
    yearsExperience: 6,
    trustBadge: 'gold',
    trustScore: 89,
    totalBookings: 178,
    repeatClientCount: 44,
    avgResponseTimeSeconds: 35,
    kyc: FULL_KYC,
    categorySlugs: ['yoga'],
  },
  {
    phone: '+919876500005',
    fullName: 'Amit Kumar',
    profilePhoto: avatar('amit-kumar'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Electrician',
    bio: 'New to TrustNear but a decade in the field. Wiring, fixtures, fan installation.',
    yearsExperience: 2,
    trustBadge: 'bronze',
    trustScore: 64,
    totalBookings: 89,
    repeatClientCount: 6,
    avgResponseTimeSeconds: 90,
    kyc: BASIC_KYC,
    categorySlugs: ['electrical'],
  },
  {
    phone: '+919876500006',
    fullName: 'Sonia Khandelwal',
    profilePhoto: avatar('sonia-khandelwal'),
    locality: 'vaishali-nagar',
    professionalTitle: 'TrustNear Spa Therapist',
    bio: 'Trained in Swedish, deep tissue, and Ayurvedic massage techniques.',
    yearsExperience: 3,
    trustBadge: 'silver',
    trustScore: 75,
    totalBookings: 142,
    repeatClientCount: 18,
    avgResponseTimeSeconds: 55,
    kyc: PARTIAL_KYC,
    categorySlugs: ['spa-massage'],
  },

  // ─── Mansarovar ─────────────────────────────────────────────
  {
    phone: '+919876500007',
    fullName: 'Ravi Yadav',
    profilePhoto: avatar('ravi-yadav'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear AC Tech',
    bio: '5 years AC servicing across Jaipur. Carries gauge, gas, and genuine spare parts.',
    yearsExperience: 5,
    trustBadge: 'silver',
    trustScore: 80,
    totalBookings: 298,
    repeatClientCount: 27,
    avgResponseTimeSeconds: 48,
    kyc: FULL_KYC,
    categorySlugs: ['ac-service', 'appliance-repair'],
  },
  {
    phone: '+919876500008',
    fullName: 'Pooja Mishra',
    profilePhoto: avatar('pooja-mishra'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear Tutor',
    bio: 'BEd + MA Maths. Class 6-10 Maths, Science, English. CBSE/RBSE board prep.',
    yearsExperience: 7,
    trustBadge: 'gold',
    trustScore: 88,
    totalBookings: 95,
    repeatClientCount: 31,
    avgResponseTimeSeconds: 40,
    kyc: FULL_KYC,
    categorySlugs: ['tutor'],
  },
  {
    phone: '+919876500009',
    fullName: 'Sanjay Meena',
    profilePhoto: avatar('sanjay-meena'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear Photographer',
    bio: 'Family portraits, birthdays, pre-wedding shoots. Edited delivery in 48 hrs.',
    yearsExperience: 3,
    trustBadge: 'bronze',
    trustScore: 68,
    totalBookings: 64,
    repeatClientCount: 7,
    avgResponseTimeSeconds: 85,
    kyc: BASIC_KYC,
    categorySlugs: ['photography'],
  },
  {
    phone: '+919876500010',
    fullName: 'Geeta Verma',
    profilePhoto: avatar('geeta-verma'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear Cleaning Pro',
    bio: 'Quick, thorough, and reliable. Same maid for repeat customers if requested.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 77,
    totalBookings: 312,
    repeatClientCount: 29,
    avgResponseTimeSeconds: 50,
    kyc: PARTIAL_KYC,
    categorySlugs: ['home-cleaning'],
  },
  {
    phone: '+919876500011',
    fullName: 'Mukesh Saini',
    profilePhoto: avatar('mukesh-saini'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear Pest Pro',
    bio: 'Government-licensed pesticide handler. Safe formulations, kid + pet friendly.',
    yearsExperience: 2,
    trustBadge: 'bronze',
    trustScore: 65,
    totalBookings: 71,
    repeatClientCount: 5,
    avgResponseTimeSeconds: 95,
    kyc: BASIC_KYC,
    categorySlugs: ['pest-control', 'sanitization'],
  },
  {
    phone: '+919876500012',
    fullName: 'Rakhi Kanwar',
    profilePhoto: avatar('rakhi-kanwar'),
    locality: 'mansarovar',
    professionalTitle: 'TrustNear Beauty Pro',
    bio: 'Threading, waxing, facials, spa pedicures. Hygienic single-use tools always.',
    yearsExperience: 6,
    trustBadge: 'gold',
    trustScore: 86,
    totalBookings: 421,
    repeatClientCount: 47,
    avgResponseTimeSeconds: 38,
    kyc: FULL_KYC,
    categorySlugs: ['salon-women', 'spa-massage'],
  },

  // ─── Malviya Nagar ──────────────────────────────────────────
  {
    phone: '+919876500013',
    fullName: 'Manish Choudhary',
    profilePhoto: avatar('manish-choudhary'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear Plumber',
    bio: 'Master plumber, 9 yrs. Major leaks, full bathroom fittings, drainage work.',
    yearsExperience: 9,
    trustBadge: 'platinum',
    trustScore: 95,
    totalBookings: 743,
    repeatClientCount: 89,
    avgResponseTimeSeconds: 25,
    kyc: FULL_KYC,
    categorySlugs: ['plumbing'],
  },
  {
    phone: '+919876500014',
    fullName: 'Neha Agarwal',
    profilePhoto: avatar('neha-agarwal'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear Fitness Coach',
    bio: 'NSCA-certified personal trainer. Weight loss + strength programs, women-focused.',
    yearsExperience: 5,
    trustBadge: 'gold',
    trustScore: 84,
    totalBookings: 187,
    repeatClientCount: 41,
    avgResponseTimeSeconds: 42,
    kyc: FULL_KYC,
    categorySlugs: ['fitness-trainer', 'yoga'],
  },
  {
    phone: '+919876500015',
    fullName: 'Sunil Saini',
    profilePhoto: avatar('sunil-saini'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear Barber',
    bio: 'Hair cuts, beard trim, head massage. Carries clean cape, tools, and disinfectant.',
    yearsExperience: 3,
    trustBadge: 'silver',
    trustScore: 74,
    totalBookings: 254,
    repeatClientCount: 32,
    avgResponseTimeSeconds: 55,
    kyc: PARTIAL_KYC,
    categorySlugs: ['mens-grooming'],
  },
  {
    phone: '+919876500016',
    fullName: 'Lalita Bhargava',
    profilePhoto: avatar('lalita-bhargava'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear Deep Clean Pro',
    bio: '6 yrs deep cleaning expertise. Pre-Diwali bookings open 4 weeks ahead.',
    yearsExperience: 6,
    trustBadge: 'gold',
    trustScore: 88,
    totalBookings: 367,
    repeatClientCount: 53,
    avgResponseTimeSeconds: 40,
    kyc: FULL_KYC,
    categorySlugs: ['deep-clean', 'home-cleaning'],
  },
  {
    phone: '+919876500017',
    fullName: 'Mahesh Jain',
    profilePhoto: avatar('mahesh-jain'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear AC Tech',
    bio: 'Split + window AC servicing. Honest diagnosis, no upsell.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 79,
    totalBookings: 216,
    repeatClientCount: 24,
    avgResponseTimeSeconds: 52,
    kyc: PARTIAL_KYC,
    categorySlugs: ['ac-service'],
  },
  {
    phone: '+919876500018',
    fullName: 'Bhavna Soni',
    profilePhoto: avatar('bhavna-soni'),
    locality: 'malviya-nagar',
    professionalTitle: 'TrustNear Beauty Pro',
    bio: 'New to TrustNear, but 5 yrs salon background. Manicure, pedicure, threading.',
    yearsExperience: 2,
    trustBadge: 'bronze',
    trustScore: 63,
    totalBookings: 58,
    repeatClientCount: 4,
    avgResponseTimeSeconds: 88,
    kyc: BASIC_KYC,
    categorySlugs: ['salon-women'],
  },

  // ─── C-Scheme ───────────────────────────────────────────────
  {
    phone: '+919876500019',
    fullName: 'Sandeep Rathore',
    profilePhoto: avatar('sandeep-rathore'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Premium Electrician',
    bio: '10 yrs in commercial + residential. Premium fittings, smart-home wiring.',
    yearsExperience: 10,
    trustBadge: 'platinum',
    trustScore: 96,
    totalBookings: 524,
    repeatClientCount: 81,
    avgResponseTimeSeconds: 22,
    kyc: FULL_KYC,
    categorySlugs: ['electrical', 'appliance-repair'],
  },
  {
    phone: '+919876500020',
    fullName: 'Renu Singh',
    profilePhoto: avatar('renu-singh'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Premium Beauty Pro',
    bio: 'Senior stylist from a 5-star spa. Bridal + party makeup, hair colouring.',
    yearsExperience: 8,
    trustBadge: 'platinum',
    trustScore: 93,
    totalBookings: 392,
    repeatClientCount: 68,
    avgResponseTimeSeconds: 30,
    kyc: FULL_KYC,
    categorySlugs: ['salon-women', 'spa-massage'],
  },
  {
    phone: '+919876500021',
    fullName: 'Tushar Goyal',
    profilePhoto: avatar('tushar-goyal'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Photographer',
    bio: 'Editorial + product + family. Sony A7IV. Same-day previews on request.',
    yearsExperience: 5,
    trustBadge: 'gold',
    trustScore: 85,
    totalBookings: 102,
    repeatClientCount: 19,
    avgResponseTimeSeconds: 36,
    kyc: FULL_KYC,
    categorySlugs: ['photography'],
  },
  {
    phone: '+919876500022',
    fullName: 'Asha Maheshwari',
    profilePhoto: avatar('asha-maheshwari'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Wellness Coach',
    bio: 'Yoga + Pilates + nutrition counselling. RYT-500 certified.',
    yearsExperience: 7,
    trustBadge: 'gold',
    trustScore: 87,
    totalBookings: 156,
    repeatClientCount: 38,
    avgResponseTimeSeconds: 33,
    kyc: FULL_KYC,
    categorySlugs: ['yoga', 'fitness-trainer'],
  },
  {
    phone: '+919876500023',
    fullName: 'Pankaj Sharma',
    profilePhoto: avatar('pankaj-sharma'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Deep Clean Pro',
    bio: 'Premium villa & bungalow deep cleans. Team of 2, high-end equipment.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 79,
    totalBookings: 198,
    repeatClientCount: 22,
    avgResponseTimeSeconds: 47,
    kyc: PARTIAL_KYC,
    categorySlugs: ['deep-clean', 'sanitization'],
  },
  {
    phone: '+919876500024',
    fullName: 'Hina Khan',
    profilePhoto: avatar('hina-khan'),
    locality: 'c-scheme',
    professionalTitle: 'TrustNear Beauty Pro',
    bio: 'Trained in keratin, Olaplex, advanced skin care. Premium clientele.',
    yearsExperience: 6,
    trustBadge: 'gold',
    trustScore: 86,
    totalBookings: 287,
    repeatClientCount: 49,
    avgResponseTimeSeconds: 41,
    kyc: FULL_KYC,
    categorySlugs: ['salon-women'],
  },

  // ─── Jagatpura ──────────────────────────────────────────────
  {
    phone: '+919876500025',
    fullName: 'Deepak Vyas',
    profilePhoto: avatar('deepak-vyas'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Handyman',
    bio: 'Plumbing + electrical + minor repairs. One call, multiple fixes.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 76,
    totalBookings: 234,
    repeatClientCount: 26,
    avgResponseTimeSeconds: 58,
    kyc: PARTIAL_KYC,
    categorySlugs: ['plumbing', 'electrical'],
  },
  {
    phone: '+919876500026',
    fullName: 'Sushil Kumar',
    profilePhoto: avatar('sushil-kumar'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Tutor',
    bio: 'Engineering grad. JEE foundation for class 9-12. Maths + Physics + Chemistry.',
    yearsExperience: 3,
    trustBadge: 'bronze',
    trustScore: 70,
    totalBookings: 41,
    repeatClientCount: 11,
    avgResponseTimeSeconds: 75,
    kyc: BASIC_KYC,
    categorySlugs: ['tutor', 'photography'],
  },
  {
    phone: '+919876500027',
    fullName: 'Faisal Ansari',
    profilePhoto: avatar('faisal-ansari'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Barber',
    bio: 'Modern fades, beard sculpting, hot-towel shave. Sterilised tools every session.',
    yearsExperience: 5,
    trustBadge: 'silver',
    trustScore: 81,
    totalBookings: 312,
    repeatClientCount: 44,
    avgResponseTimeSeconds: 49,
    kyc: PARTIAL_KYC,
    categorySlugs: ['mens-grooming'],
  },
  {
    phone: '+919876500028',
    fullName: 'Anil Mathur',
    profilePhoto: avatar('anil-mathur'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Appliance Pro',
    bio: 'Washing machine, microwave, fridge repair. Authorised for major brands.',
    yearsExperience: 2,
    trustBadge: 'bronze',
    trustScore: 66,
    totalBookings: 84,
    repeatClientCount: 8,
    avgResponseTimeSeconds: 80,
    kyc: BASIC_KYC,
    categorySlugs: ['ac-service', 'appliance-repair'],
  },
  {
    phone: '+919876500029',
    fullName: 'Rajesh Gupta',
    profilePhoto: avatar('rajesh-gupta'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Cleaning Pro',
    bio: 'Reliable weekly cleaning. Two-person team for larger flats.',
    yearsExperience: 2,
    trustBadge: 'bronze',
    trustScore: 67,
    totalBookings: 96,
    repeatClientCount: 9,
    avgResponseTimeSeconds: 78,
    kyc: BASIC_KYC,
    categorySlugs: ['home-cleaning'],
  },
  {
    phone: '+919876500030',
    fullName: 'Kavita Joshi',
    profilePhoto: avatar('kavita-joshi'),
    locality: 'jagatpura',
    professionalTitle: 'TrustNear Beauty Pro',
    bio: 'Threading, waxing, hair styling at home. Same-day slots usually open.',
    yearsExperience: 4,
    trustBadge: 'silver',
    trustScore: 78,
    totalBookings: 198,
    repeatClientCount: 27,
    avgResponseTimeSeconds: 53,
    kyc: PARTIAL_KYC,
    categorySlugs: ['salon-women'],
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
    value: [
      'home-care',
      'appliances',
      'repairs',
      'beauty-wellness',
      'daily-help',
      'care-services',
      'pet-care',
      'vehicle-driver',
      'outdoor',
      'lifestyle',
    ],
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

/**
 * Seed 30 experts (User + Professional + ProLocation + Schedule + Offerings).
 * Idempotent: re-running updates instead of duplicating. Coordinates jittered
 * by a small index-derived offset so pros don't stack on the same pixel.
 */
async function seedExperts(): Promise<void> {
  console.log('🌱 Seeding experts (User + Professional + Location + Schedule + Offerings)…');

  // Build a slug→id map once so we don't re-query inside the inner loop
  const cats = await prisma.serviceCategory.findMany({ select: { id: true, slug: true } });
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id] as const));

  for (let i = 0; i < experts.length; i++) {
    const e = experts[i]!;
    const loc = localities[e.locality];
    // ±0.003° lat ≈ ±330m, ±0.0025° lng ≈ ±250m at Jaipur's latitude
    const jitterLat = (((i * 7) % 7) - 3) * 0.001;
    const jitterLng = (((i * 11) % 5) - 2) * 0.00125;
    const lat = loc.lat + jitterLat;
    const lng = loc.lng + jitterLng;

    const user = await prisma.user.upsert({
      where: { phone: e.phone },
      update: {
        fullName: e.fullName,
        profilePhoto: e.profilePhoto,
        area: loc.name,
        latitude: lat,
        longitude: lng,
        isVerified: true,
      },
      create: {
        phone: e.phone,
        fullName: e.fullName,
        role: 'professional',
        profilePhoto: e.profilePhoto,
        city: 'Jaipur',
        area: loc.name,
        latitude: lat,
        longitude: lng,
        isVerified: true,
        referralCode: `TNPRO${String(i + 1).padStart(3, '0')}`,
      },
    });

    const pro = await prisma.professional.upsert({
      where: { userId: user.id },
      update: {
        professionalTitle: e.professionalTitle,
        bio: e.bio,
        yearsExperience: e.yearsExperience,
        trustScore: e.trustScore,
        trustBadge: e.trustBadge,
        availabilityStatus: 'online',
        aadhaarVerified: e.kyc.aadhaar,
        faceVerified: e.kyc.face,
        bankVerified: e.kyc.bank,
        policeVerified: e.kyc.police,
        totalBookings: e.totalBookings,
        repeatClientCount: e.repeatClientCount,
        avgResponseTimeSeconds: e.avgResponseTimeSeconds,
      },
      create: {
        userId: user.id,
        professionalTitle: e.professionalTitle,
        bio: e.bio,
        yearsExperience: e.yearsExperience,
        trustScore: e.trustScore,
        trustBadge: e.trustBadge,
        availabilityStatus: 'online',
        aadhaarVerified: e.kyc.aadhaar,
        faceVerified: e.kyc.face,
        bankVerified: e.kyc.bank,
        policeVerified: e.kyc.police,
        totalBookings: e.totalBookings,
        repeatClientCount: e.repeatClientCount,
        avgResponseTimeSeconds: e.avgResponseTimeSeconds,
      },
    });

    await prisma.proLocation.upsert({
      where: { professionalId: pro.id },
      update: { latitude: lat, longitude: lng },
      create: { professionalId: pro.id, latitude: lat, longitude: lng },
    });

    // Schedule — open every day 7-21h. Sunday late start kept simple for v1.
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

    // Offerings — one per category the expert serves
    for (const slug of e.categorySlugs) {
      const categoryId = catBySlug.get(slug);
      if (!categoryId) {
        console.warn(`  ⚠ skipping unknown category ${slug} for ${e.fullName}`);
        continue;
      }
      await prisma.proServiceOffering.upsert({
        where: { professionalId_categoryId: { professionalId: pro.id, categoryId } },
        update: { experienceYears: e.yearsExperience, isActive: true },
        create: {
          professionalId: pro.id,
          categoryId,
          experienceYears: e.yearsExperience,
        },
      });
    }

    console.log(`  ✓ ${e.fullName} (${loc.name}) — ${e.categorySlugs.length} svc, ${e.trustBadge}`);
  }

  console.log(
    `✓ Seeded ${experts.length} experts across ${Object.keys(localities).length} localities`,
  );
}

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

  await seedExperts();

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
