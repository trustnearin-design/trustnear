import { prisma, type PromoDiscountType } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';

const SELECT = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  value: true,
  maxDiscount: true,
  minOrderAmount: true,
  usageLimit: true,
  usageCount: true,
  perUserLimit: true,
  isActive: true,
  validFrom: true,
  validUntil: true,
  createdAt: true,
} as const;

export async function listPromoCodes(args: { active?: boolean; search?: string; limit: number }) {
  const where: Record<string, unknown> = {};
  if (args.active !== undefined) where['isActive'] = args.active;
  if (args.search) where['code'] = { contains: args.search.trim().toUpperCase() };

  return prisma.promoCode.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { validUntil: 'desc' }],
    take: args.limit,
    select: SELECT,
  });
}

export async function getPromoCode(id: string) {
  const row = await prisma.promoCode.findUnique({ where: { id }, select: SELECT });
  if (!row) throw new NotFoundError('Promo code not found');
  return row;
}

export async function createPromoCode(input: {
  code: string;
  description?: string | null;
  discountType: PromoDiscountType;
  value: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  perUserLimit: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
}) {
  if (input.validUntil <= input.validFrom) {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'validUntil must be after validFrom');
  }
  if (input.discountType === 'percent' && input.value > 10000) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'percent value is x100, so max is 10000 (= 100%)',
    );
  }
  const existing = await prisma.promoCode.findUnique({ where: { code: input.code.toUpperCase() } });
  if (existing) {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Code already exists');
  }
  return prisma.promoCode.create({
    data: { ...input, code: input.code.toUpperCase() },
    select: SELECT,
  });
}

export async function updatePromoCode(
  id: string,
  patch: Partial<{
    code: string;
    description: string | null;
    discountType: PromoDiscountType;
    value: number;
    maxDiscount: number | null;
    minOrderAmount: number;
    usageLimit: number | null;
    perUserLimit: number;
    isActive: boolean;
    validFrom: Date;
    validUntil: Date;
  }>,
) {
  const existing = await prisma.promoCode.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Promo code not found');

  if (patch.code && patch.code.toUpperCase() !== existing.code) {
    const dup = await prisma.promoCode.findUnique({
      where: { code: patch.code.toUpperCase() },
    });
    if (dup) throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Code already exists');
  }

  const data: Record<string, unknown> = { ...patch };
  if (patch.code) data['code'] = patch.code.toUpperCase();

  return prisma.promoCode.update({ where: { id }, data: data as never, select: SELECT });
}

export async function archivePromoCode(id: string) {
  const existing = await prisma.promoCode.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Promo code not found');
  return prisma.promoCode.update({
    where: { id },
    data: { isActive: false },
    select: SELECT,
  });
}
