import { prisma } from '@sevalink/db';
import { calculateCommission } from '@sevalink/utils';
import { logger } from '../../logger.js';

export interface PriceBreakdown {
  basePrice: number; // paise
  platformFee: number;
  promoDiscount: number;
  commission: number;
  totalAmount: number;
  proPayout: number;
}

const DEFAULT_SAFETY_FEE_PAISE = 1900; // ₹19
const DEFAULT_COMMISSION_PCT = 15;

async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

/**
 * Calculate booking price using category base + duration + safety fee.
 * Pulls live values from app_config so admins can tune without redeploying.
 *
 * Pricing rules:
 *   - per_hour:  base * (durationMinutes / 60)
 *   - per_visit: base * 1
 *   - per_day:   base * ceil(durationMinutes / (8*60))   (assume 8h/day)
 *   - fixed:     base * 1
 */
export async function calculatePrice(args: {
  categoryId: string;
  durationMinutes: number;
  promoDiscountPaise?: number;
}): Promise<PriceBreakdown> {
  const category = await prisma.serviceCategory.findFirst({
    where: { id: args.categoryId, isActive: true, deletedAt: null },
    select: { basePrice: true, priceUnit: true, commissionRate: true },
  });
  if (!category) {
    throw new Error(`Category not found or inactive: ${args.categoryId}`);
  }

  let basePrice: number;
  switch (category.priceUnit) {
    case 'per_hour':
      basePrice = Math.round(category.basePrice * (args.durationMinutes / 60));
      break;
    case 'per_day':
      basePrice = category.basePrice * Math.max(1, Math.ceil(args.durationMinutes / (8 * 60)));
      break;
    case 'per_visit':
    case 'fixed':
    default:
      basePrice = category.basePrice;
      break;
  }

  const safetyTiers = await getConfig<{ standard: number; premium?: number; emergency?: number }>(
    'safety_fee_tiers',
    { standard: DEFAULT_SAFETY_FEE_PAISE },
  );
  const platformFee = safetyTiers.standard;

  const promoDiscount = args.promoDiscountPaise ?? 0;

  const subtotal = basePrice + platformFee - promoDiscount;
  const totalAmount = Math.max(0, subtotal);

  const commissionRate = Number(category.commissionRate) || DEFAULT_COMMISSION_PCT;
  const commission = calculateCommission(basePrice, commissionRate);

  // Pro gets the labour portion minus the platform's commission.
  // Safety fee always stays with the platform (it funds insurance/support).
  const proPayout = Math.max(0, basePrice - commission);

  logger.debug(
    {
      categoryId: args.categoryId,
      basePrice,
      platformFee,
      promoDiscount,
      commission,
      totalAmount,
      proPayout,
    },
    'pricing computed',
  );

  return {
    basePrice,
    platformFee,
    promoDiscount,
    commission,
    totalAmount,
    proPayout,
  };
}
